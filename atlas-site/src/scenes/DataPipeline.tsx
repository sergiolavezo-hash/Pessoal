'use client';

/**
 * 03 / PIPELINE — o dado precisa de um caminho.
 *
 * Três portais marcam as etapas por onde o fluxo passa: ingestão,
 * processamento, transformação. O portal do meio é menor — é ali que o
 * corredor estreita e o dado é tratado. O estreitamento não é enfeite:
 * é a mesma curva que o shader das partículas usa, então o fluxo e a
 * estrutura concordam.
 *
 * O protótipo desenhava o corredor como pares de traços verticais, que
 * viravam ruído em certos ângulos. Três anéis dizem a mesma coisa com
 * muito menos tinta.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useLifecycle } from '../lib/useLifecycle';
import { weightOf } from '../lib/lifecycle';
import { color3d } from '../lib/tokens';
import { PORTRAIT_BREAKPOINT, PORTRAIT_RING, PORTRAIT_SPAN } from './particles';

/** Mesma curva de estreitamento usada no shader das partículas. */
function squeezeAt(x: number): number {
  return 1 - 0.58 * Math.exp(-Math.pow(x * 0.5, 2));
}

const GATES = [-4.2, 0, 4.2];

export default function DataPipeline() {
  const { state } = useLifecycle();
  const { size } = useThree();
  const group = useRef<THREE.Group>(null);

  // Girar o grupo inteiro põe os portais em pé no retrato sem mexer na
  // ordem deles: a ingestão continua sendo a primeira que o dado encontra,
  // agora no topo. O mesmo giro que o shader aplica ao corredor.
  const portrait = size.width < PORTRAIT_BREAKPOINT;
  const tilt = portrait ? -Math.PI / 2 : 0;
  const span = portrait ? PORTRAIT_SPAN : 1;
  const ring = portrait ? PORTRAIT_RING : 1;

  const { geometry, material } = useMemo(() => {
    // Anel achatado: lê como um portal visto de dentro do corredor.
    const geometry = new THREE.TorusGeometry(1, 0.012, 6, 64);
    const material = new THREE.MeshBasicMaterial({
      color: color3d.atlasBlue,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    return { geometry, material };
  }, []);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame(() => {
    material.opacity = 0.32 * weightOf(state.current.phase, 'pipeline');
  });

  return (
    <group ref={group} rotation={[0, 0, tilt]}>
      {GATES.map((x) => {
        const s = squeezeAt(x);
        return (
          <mesh
            key={x}
            geometry={geometry}
            material={material}
            position={[x * span, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[s * 1.35 * ring, s * 1.35 * ring, 1]}
            frustumCulled={false}
          />
        );
      })}
    </group>
  );
}
