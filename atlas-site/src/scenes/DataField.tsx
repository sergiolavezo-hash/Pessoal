'use client';

/**
 * O campo de dados da Atlas.
 *
 * Esta cena é dona do campo de partículas inteiro: os territórios
 * seguintes não criam partículas novas, eles movem estas mesmas. É o que
 * faz a página parecer um só lugar em vez de uma sequência de telas.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import { createParticleField, PORTRAIT_BREAKPOINT } from './particles';
import { useLifecycle } from '../lib/useLifecycle';
import { budgetFor } from '../lib/quality';

export default function DataField() {
  const { state, quality, capability } = useLifecycle();
  const { size } = useThree();
  const points = useRef<THREE.Points>(null);

  const field = useMemo(() => createParticleField(budgetFor(quality).particles), [quality]);

  // Geometria e materiais não são coletados pelo GC do JS — a GPU precisa
  // de dispose explícito quando a cena sai ou a qualidade muda.
  useEffect(() => () => field.dispose(), [field]);

  useEffect(() => {
    field.material.uniforms.uScale.value = size.width < 720 ? 0.78 : 1;
    field.material.uniforms.uPortrait.value = size.width < PORTRAIT_BREAKPOINT ? 1 : 0;
  }, [field, size.width]);

  useFrame((_, delta) => {
    const u = field.material.uniforms;
    u.uPhase.value = state.current.phase;
    // Congelar o tempo é uma decisão sobre PREFERÊNCIA, não sobre GPU:
    // quem pediu menos movimento não vê o campo respirar. Uma máquina
    // lenta continua vendo — a respiração custa quase nada, e amarrá-la ao
    // nível de qualidade fazia um rebaixamento momentâneo matar o
    // movimento da página inteira, para sempre.
    if (!capability?.reducedMotion && quality !== 'static') u.uTime.value += delta;
  });

  return <points ref={points} geometry={field.geometry} material={field.material} frustumCulled={false} />;
}
