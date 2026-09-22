'use client';

/**
 * 02 / CAPTURE — muitas fontes, um fluxo.
 *
 * Oito marcadores marcam os sistemas que registram eventos (ERP, CRM,
 * banco, API, app, sensor, arquivo, stream). Os nomes vivem no HTML do
 * capítulo, não no canvas: o 3D mostra a posição e a convergência, o
 * texto diz quais são.
 *
 * O protótipo desenhava oito linhas até o centro e virava um asterisco
 * genérico. Aqui a convergência é mostrada pelo movimento das partículas
 * (que se agrupam nas fontes e depois escoam para o corredor), não por
 * linhas decorativas.
 *
 * InstancedMesh: oito octaedros idênticos = uma draw call.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sourcePositions } from './particles';
import { useLifecycle } from '../lib/useLifecycle';
import { weightOf } from '../lib/lifecycle';
import { color3d } from '../lib/tokens';

export default function DataSources() {
  const { state } = useLifecycle();
  const mesh = useRef<THREE.InstancedMesh>(null);

  const sources = useMemo(() => sourcePositions(), []);
  const geometry = useMemo(() => new THREE.OctahedronGeometry(0.15, 0), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: color3d.atlasBlueLight,
      wireframe: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    []
  );

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  // As posições são fixas: gravadas uma vez, não por quadro.
  useEffect(() => {
    if (!mesh.current) return;
    const m = new THREE.Matrix4();
    sources.forEach((p, i) => {
      m.makeTranslation(p.x, p.y, p.z);
      mesh.current!.setMatrixAt(i, m);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [sources]);

  useFrame(() => {
    // Os marcadores só existem enquanto o capítulo deles importa.
    material.opacity = 0.85 * weightOf(state.current.phase, 'capture');
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, sources.length]}
      frustumCulled={false}
    />
  );
}
