'use client';

/**
 * CAPTURE — as oito fontes de onde o dado entra.
 *
 * Marcas de levantamento, como num mapa: uma cruz e um pequeno quadro,
 * não um objeto 3D. Os nomes (ERP, CRM, API…) vivem no HTML do capítulo;
 * aqui fica só a posição, que é o que o texto não consegue mostrar.
 *
 * Uma geometria mesclada com as oito marcas: uma draw call, sem
 * instancing, porque linha não instancia mais barato que isso.
 */
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useLifecycle } from '../lib/useLifecycle';
import { weightOf } from '../lib/lifecycle';
import { color3d } from '../lib/tokens';
import { PORTRAIT_BREAKPOINT, sourcePositions } from './particles';

function buildMarks(portrait: boolean): THREE.BufferGeometry {
  const v: number[] = [];
  const a = 0.3;
  const b = 0.16;
  for (const p of sourcePositions(portrait)) {
    v.push(p.x - a, p.y, p.z, p.x + a, p.y, p.z);
    v.push(p.x, p.y - a, p.z, p.x, p.y + a, p.z);
    v.push(p.x - b, p.y - b, p.z, p.x + b, p.y - b, p.z);
    v.push(p.x + b, p.y - b, p.z, p.x + b, p.y + b, p.z);
    v.push(p.x + b, p.y + b, p.z, p.x - b, p.y + b, p.z);
    v.push(p.x - b, p.y + b, p.z, p.x - b, p.y - b, p.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return g;
}

export default function Sources() {
  const { state } = useLifecycle();
  const { size } = useThree();
  const portrait = size.width < PORTRAIT_BREAKPOINT;

  const geometry = useMemo(() => buildMarks(portrait), [portrait]);
  const material = useMemo(
    () => new THREE.LineBasicMaterial({
      color: color3d.atlasBlueLight,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    []
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    material.opacity = 0.75 * weightOf(state.current.phase, 'capture');
  });

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />;
}
