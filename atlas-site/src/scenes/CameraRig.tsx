'use client';

/**
 * Coreografia de câmera.
 *
 * Um plano por seção. A câmera nunca corta — ela interpola entre os
 * planos conforme a fase, então o visitante percebe que atravessou um
 * mesmo território em vez de trocar de tela.
 *
 * Cada plano muda posição E ângulo de forma perceptível: na Fase 01 o
 * desktop guardava quase todo o movimento para o fim, e a página parecia
 * parada enquanto o usuário rolava. Aqui o deslocamento está distribuído
 * — cada tela devolve movimento ao scroll.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useLifecycle } from '../lib/useLifecycle';
import { stepPhase } from '../lib/lifecycle';
import { motion } from '../lib/tokens';
import { PORTRAIT_BREAKPOINT } from './particles';

interface Shot {
  position: [number, number, number];
  lookAt: [number, number, number];
}

/** Índice = fase. Um plano por seção da página. */
const SHOTS: Shot[] = [
  { position: [0, 2.6, 12.5], lookAt: [0, -0.4, 0] },   // 00 hero — o território inteiro, de cima
  { position: [-6.2, 1.4, 9.0], lookAt: [0, -0.2, 0] }, // 01 serviços — desliza para o lado
  { position: [0.6, 0.9, 9.4], lookAt: [0, 0, 0] },     // 02 capture — de frente, o anel de fontes
  { position: [6.4, 2.2, 7.6], lookAt: [0, 0, 0] },     // 03 organize — de lado: as camadas se separam
  { position: [0, 0.6, 9.2], lookAt: [0, 0.2, 0] },     // 04 understand — de frente, o perfil se lê
  { position: [-3.8, 1.2, 8.4], lookAt: [0.8, 0.4, 0] },// 05 intelligence — ângulo: a projeção ganha profundidade
  { position: [0, 0, 7.2], lookAt: [0, 0, 0] },         // 06 decide — fecha no ponto
  { position: [0, 3.4, 14.0], lookAt: [0, -0.6, 0] },   // 07 o ciclo — recua e mostra o mapa todo
  { position: [-5.0, 2.0, 13.0], lookAt: [0, -0.4, 0] },// 08 cases
  { position: [4.4, 1.6, 12.4], lookAt: [0, -0.3, 0] }, // 09 tecnologia
  { position: [0, 1.0, 11.0], lookAt: [0, -0.2, 0] },   // 10 contato
];

/**
 * Retrato: o texto ocupa a largura inteira e a caixa é alta. Os planos
 * recuam e sobem, e a câmera olha um pouco acima do centro para que o
 * território fique na faixa livre abaixo do texto.
 */
const PORTRAIT_SHOTS: Shot[] = [
  { position: [0, 3.0, 13.5], lookAt: [0, 1.6, 0] },
  { position: [-2.6, 2.2, 11.5], lookAt: [0, 1.8, 0] },
  { position: [0.4, 1.6, 11.2], lookAt: [0, 1.9, 0] },
  { position: [3.6, 2.6, 9.6], lookAt: [0, 1.7, 0] },
  { position: [0, 1.2, 11.0], lookAt: [0, 2.0, 0] },
  { position: [-2.2, 1.8, 10.4], lookAt: [0.4, 2.0, 0] },
  { position: [0, 0.8, 9.0], lookAt: [0, 1.8, 0] },
  { position: [0, 3.6, 15.0], lookAt: [0, 1.4, 0] },
  { position: [-2.8, 2.4, 14.0], lookAt: [0, 1.5, 0] },
  { position: [2.4, 2.0, 13.4], lookAt: [0, 1.5, 0] },
  { position: [0, 1.4, 12.0], lookAt: [0, 1.6, 0] },
];

/**
 * No desktop a coluna editorial ocupa a esquerda. Deslocar a janela de
 * projeção empurra o território para a direita, então nada atravessa o
 * texto — sem mexer na posição da câmera, que é da narrativa.
 */
const FRAME_SHIFT = 0.13;

function sampleShot(
  phase: number,
  shots: Shot[],
  out: { pos: THREE.Vector3; look: THREE.Vector3 }
) {
  const i = Math.max(0, Math.min(shots.length - 1, Math.floor(phase)));
  const j = Math.min(shots.length - 1, i + 1);
  const f = phase - i;
  const a = shots[i];
  const b = shots[j];
  out.pos.set(
    a.position[0] + (b.position[0] - a.position[0]) * f,
    a.position[1] + (b.position[1] - a.position[1]) * f,
    a.position[2] + (b.position[2] - a.position[2]) * f
  );
  out.look.set(
    a.lookAt[0] + (b.lookAt[0] - a.lookAt[0]) * f,
    a.lookAt[1] + (b.lookAt[1] - a.lookAt[1]) * f,
    a.lookAt[2] + (b.lookAt[2] - a.lookAt[2]) * f
  );
}

export default function CameraRig() {
  const { state, quality } = useLifecycle();
  const { camera, size } = useThree();
  const scratch = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
  const pointer = useRef({ x: 0, y: 0 });
  const offset = useRef<string>('');

  // Reaplica só quando a geometria da janela muda: setViewOffset recalcula
  // a matriz de projeção e não precisa rodar a cada quadro.
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const shift = size.width >= PORTRAIT_BREAKPOINT ? Math.round(size.width * FRAME_SHIFT) : 0;
    const key = `${size.width}x${size.height}:${shift}`;
    if (offset.current === key) return;
    offset.current = key;
    if (shift === 0) cam.clearViewOffset();
    else cam.setViewOffset(size.width, size.height, -shift, 0, size.width, size.height);
  }, [camera, size.width, size.height]);

  useFrame(({ pointer: p }) => {
    // A fase persegue o alvo do scroll com amortecimento: a câmera segue
    // o usuário, não salta com ele. Em reduced-motion, vai direto.
    const damping = quality === 'low' || quality === 'static' ? 1 : motion.cameraDamping;
    stepPhase(state.current, damping);

    const portrait = size.width < PORTRAIT_BREAKPOINT;
    sampleShot(state.current.phase, portrait ? PORTRAIT_SHOTS : SHOTS, scratch.current);

    // Paralaxe de ponteiro só onde faz sentido (não em toque, não em
    // reduced-motion) e sempre discreta: informa profundidade.
    const allowParallax = quality === 'high' || quality === 'medium';
    if (allowParallax && !portrait) {
      pointer.current.x += (p.x - pointer.current.x) * 0.05;
      pointer.current.y += (p.y - pointer.current.y) * 0.05;
    }

    camera.position.set(
      scratch.current.pos.x + pointer.current.x * 0.5,
      scratch.current.pos.y - pointer.current.y * 0.32,
      scratch.current.pos.z
    );
    camera.lookAt(scratch.current.look);
  });

  return null;
}
