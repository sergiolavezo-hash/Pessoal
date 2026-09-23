'use client';

/**
 * O território — a carta sobre a qual o dado se posiciona.
 *
 * Uma gratícula rasa com linhas de referência e marcas de coordenada.
 * Não é textura decorativa: é a régua que dá escala e profundidade ao
 * campo, e é o que faz a cena ler como atlas em vez de fundo escuro.
 *
 * Fica presente a página inteira, discreta, e firma um pouco onde o dado
 * está sendo posto em ordem. Um único LineSegments: uma draw call para
 * toda a malha.
 */
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useLifecycle } from '../lib/useLifecycle';
import { PHASE } from '../lib/lifecycle';
import { color3d } from '../lib/tokens';
import { PORTRAIT_BREAKPOINT } from './particles';

function buildGraticule(portrait: boolean): THREE.BufferGeometry {
  const hx = portrait ? 4.6 : 9.4;
  const hz = portrait ? 4.4 : 6.2;
  const step = portrait ? 1.55 : 1.9;
  const y = -2.35;
  const v: number[] = [];

  for (let x = -hx; x <= hx + 0.001; x += step) v.push(x, y, -hz, x, y, hz);
  for (let z = -hz; z <= hz + 0.001; z += step) v.push(-hx, y, z, hx, y, z);

  // marcas de coordenada na borda: a carta é medida, não infinita
  for (let x = -hx; x <= hx + 0.001; x += step * 2) {
    v.push(x, y, -hz, x, y + 0.34, -hz);
    v.push(x, y, hz, x, y + 0.34, hz);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return g;
}

export default function Territory() {
  const { state } = useLifecycle();
  const { size } = useThree();
  const portrait = size.width < PORTRAIT_BREAKPOINT;

  const geometry = useMemo(() => buildGraticule(portrait), [portrait]);
  const material = useMemo(
    () => new THREE.LineBasicMaterial({
      color: color3d.atlasBlue,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    []
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    // Mais presente onde o assunto é estrutura (organizar), mais apagada
    // onde o assunto é o próprio dado.
    const p = state.current.phase;
    const near = THREE.MathUtils.clamp(1 - Math.abs(p - PHASE.organize) / 2.2, 0, 1);
    material.opacity = 0.1 + 0.12 * near;
  });

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />;
}
