'use client';

/**
 * O palco. Um único <Canvas> fixo, atravessado pela narrativa inteira.
 *
 * Responsabilidades: criar o renderer, montar as cenas que estão em
 * alcance da fase atual e vigiar o custo por quadro. Nenhuma cena faz
 * isso por conta própria.
 */
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useLifecycle } from '../lib/useLifecycle';
import { budgetFor, createFrameWatch } from '../lib/quality';
import { SCENES, isInRange } from '../scenes/registry';
import CameraRig from '../scenes/CameraRig';

/** Monta e desmonta cenas conforme a câmera se aproxima dos capítulos. */
function SceneRouter() {
  const { state } = useLifecycle();
  const [live, setLive] = useState<string[]>([]);

  useFrame(() => {
    const next = SCENES.filter((s) => isInRange(s, state.current.phase)).map((s) => s.id);
    // Só publica quando o conjunto muda — isto roda a 60 fps.
    if (next.length !== live.length || next.some((c, i) => c !== live[i])) setLive(next);
  });

  return (
    <>
      {SCENES.filter((s) => live.includes(s.id)).map(({ id, Component }) => (
        <Suspense key={id} fallback={null}>
          <Component />
        </Suspense>
      ))}
    </>
  );
}

/** Rebaixa a qualidade se o custo real estourar o orçamento de forma sustentada. */
function FrameWatch() {
  const { downgrade } = useLifecycle();
  const watch = useRef(createFrameWatch((median) => {
    console.info(`[atlas] quadro mediano em ${median.toFixed(1)}ms — rebaixando qualidade`);
    downgrade();
  }));
  useFrame(({ clock }) => watch.current(clock.getElapsedTime() * 1000));
  return null;
}

export default function AtlasCanvas() {
  const { quality, capability } = useLifecycle();
  const [mounted, setMounted] = useState(false);

  // O canvas só entra depois da primeira pintura: o texto do hero é o
  // conteúdo principal e não deve esperar por WebGL.
  useEffect(() => {
    const id = window.requestIdleCallback
      ? window.requestIdleCallback(() => setMounted(true))
      : window.setTimeout(() => setMounted(true), 200);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(id as number);
      else window.clearTimeout(id as number);
    };
  }, []);

  // Sem WebGL não há canvas: a narrativa editorial assume sozinha.
  if (!capability || capability.level === 'static' || !mounted) return null;

  return (
    <div className="stage" aria-hidden="true">
      <Canvas
        dpr={budgetFor(quality).dpr}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 46, near: 0.1, far: 100, position: [0, 0, 6.2] }}
        // A fase muda por scroll e o fluxo é contínuo: não há quadro
        // ocioso para pular. O custo é contido pelo DPR e pelo FrameWatch.
        frameloop="always"
      >
        <CameraRig />
        <FrameWatch />
        <SceneRouter />
      </Canvas>
    </div>
  );
}
