'use client';

/**
 * Coreografia de câmera.
 *
 * Um plano por capítulo. A câmera nunca corta — ela interpola entre os
 * planos conforme a fase, então o usuário percebe que atravessou um
 * mesmo espaço em vez de trocar de tela.
 *
 * No protótipo a câmera só mudava de distância. Aqui ela recua para
 * revelar o território (origem), contorna o anel de fontes (captura) e
 * finalmente ENTRA no corredor (pipeline) — o movimento conta a história.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useLifecycle } from '../lib/useLifecycle';
import { stepPhase } from '../lib/lifecycle';
import { motion } from '../lib/tokens';

interface Shot {
  position: [number, number, number];
  lookAt: [number, number, number];
}

/** Índice = fase. Um plano por capítulo da Fase 01. */
const SHOTS: Shot[] = [
  { position: [0, 0, 6.2], lookAt: [0, 0, 0] },      // 00 sinal — perto, silêncio
  { position: [0, 0.6, 13.5], lookAt: [0, 0, 0] },   // 01 origem — recua, revela
  { position: [3.4, 1.2, 11.2], lookAt: [0, 0, 0] }, // 02 captura — contorna o anel inteiro
  { position: [-9.5, 2.6, 8.2], lookAt: [0, 0, 0] }, // 03 pipeline — 3/4, os três portais em fila
];

/**
 * No desktop a coluna editorial ocupa a esquerda da tela. Deslocar a
 * janela de projeção empurra o mundo 3D para a direita, então nada
 * atravessa o texto — sem mexer na posição da câmera, que é da narrativa.
 * No mobile o texto cobre a largura toda e o deslocamento é zerado.
 */
const FRAME_SHIFT = 0.13;

function sampleShot(phase: number, out: { pos: THREE.Vector3; look: THREE.Vector3 }) {
  const i = Math.max(0, Math.min(SHOTS.length - 1, Math.floor(phase)));
  const j = Math.min(SHOTS.length - 1, i + 1);
  const f = phase - i;
  const a = SHOTS[i];
  const b = SHOTS[j];
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
    const shift = size.width >= 900 ? Math.round(size.width * FRAME_SHIFT) : 0;
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

    sampleShot(state.current.phase, scratch.current);

    // Tela estreita enquadra muito menos mundo: a câmera recua na própria
    // direção de visada para que a cena inteira continue cabendo.
    if (size.width < 900) {
      scratch.current.pos.sub(scratch.current.look).multiplyScalar(1.55).add(scratch.current.look);
    }

    // Paralaxe de ponteiro só onde faz sentido (não em toque, não em
    // reduced-motion) e sempre discreta: informa profundidade, não chama atenção.
    const allowParallax = quality === 'high' || quality === 'medium';
    if (allowParallax && size.width >= 900) {
      pointer.current.x += (p.x - pointer.current.x) * 0.05;
      pointer.current.y += (p.y - pointer.current.y) * 0.05;
    }

    camera.position.set(
      scratch.current.pos.x + pointer.current.x * 0.55,
      scratch.current.pos.y - pointer.current.y * 0.35,
      scratch.current.pos.z
    );
    camera.lookAt(scratch.current.look);
  });

  return null;
}
