'use client';

/**
 * DECIDE — o ponto onde o ciclo se resolve.
 *
 * Uma única marca no centro, maior que as das fontes: tudo o que o
 * território produziu converge para uma decisão. A decisão em si — loja,
 * produto, quantidade — está no HTML, porque é informação, não enfeite.
 */
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLifecycle } from '../lib/useLifecycle';
import { weightOf } from '../lib/lifecycle';
import { color3d } from '../lib/tokens';

function buildMark(): THREE.BufferGeometry {
  const v: number[] = [];
  const a = 0.86;
  const b = 0.4;
  v.push(-a, 0, 0, a, 0, 0);
  v.push(0, -a, 0, 0, a, 0);
  v.push(-b, -b, 0, b, -b, 0);
  v.push(b, -b, 0, b, b, 0);
  v.push(b, b, 0, -b, b, 0);
  v.push(-b, b, 0, -b, -b, 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return g;
}

export default function Decision() {
  const { state } = useLifecycle();
  const geometry = useMemo(buildMark, []);
  const material = useMemo(
    () => new THREE.LineBasicMaterial({
      color: color3d.atlasBlueLight,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    []
  );

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame(() => {
    material.opacity = 0.8 * weightOf(state.current.phase, 'decide');
  });

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />;
}
