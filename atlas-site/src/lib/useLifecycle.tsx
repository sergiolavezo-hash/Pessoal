'use client';

/**
 * Ponte entre o scroll do documento e o estado do ciclo.
 *
 * A fase vive numa ref mutável, não em state: ela muda a cada quadro e
 * re-renderizar a árvore 60×/s seria desperdício. O que precisa re-renderizar
 * — o capítulo ativo, para rótulos e navegação — é publicado só quando o
 * capítulo inteiro muda.
 */
import {
  createContext, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode, type RefObject,
} from 'react';
import { SECTIONS, createLifecycle, type LifecycleState } from './lifecycle';
import { detectCapability, type Capability } from './quality';
import type { QualityLevel } from './tokens';

interface LifecycleContextValue {
  state: RefObject<LifecycleState>;
  /** Índice da seção ativa — muda raramente, seguro para render. */
  activeIndex: number;
  capability: Capability | null;
  quality: QualityLevel;
  downgrade: () => void;
}

const LifecycleContext = createContext<LifecycleContextValue | null>(null);

export function LifecycleProvider({ children }: { children: ReactNode }) {
  const state = useRef<LifecycleState>(createLifecycle());
  const [activeIndex, setActiveIndex] = useState(0);
  const [capability, setCapability] = useState<Capability | null>(null);
  const [quality, setQuality] = useState<QualityLevel>('high');

  // Capacidade resolvida uma vez, no cliente.
  useEffect(() => {
    const cap = detectCapability();
    setCapability(cap);
    setQuality(cap.level);
    state.current.quality = cap.level;
    document.body.dataset.quality = cap.level;
  }, []);

  // Scroll → alvo da fase. Lê posições das seções marcadas no DOM.
  useEffect(() => {
    let raf = 0;

    const measure = () => {
      const marks = Array.from(document.querySelectorAll<HTMLElement>('[data-section-index]'));
      if (!marks.length) return;

      // A âncora de cada seção é o seu CENTRO, não o topo: assim a fase
      // vale exatamente N quando a seção N está enquadrada — e vale 0 no
      // carregamento, com o hero inteiro na tela.
      const centers = marks.map((m) => m.offsetTop + m.offsetHeight / 2);
      const y = window.scrollY + window.innerHeight / 2;

      let p: number;
      if (y <= centers[0]) {
        p = 0;
      } else if (y >= centers[centers.length - 1]) {
        p = centers.length - 1;
      } else {
        p = centers.length - 1;
        for (let i = 0; i < centers.length - 1; i++) {
          if (y >= centers[i] && y < centers[i + 1]) {
            p = i + (y - centers[i]) / Math.max(1, centers[i + 1] - centers[i]);
            break;
          }
        }
      }

      const clamped = Math.max(0, Math.min(marks.length - 1, p));
      state.current.target = clamped;
      const idx = Math.round(clamped);
      setActiveIndex((prev) => (prev === idx ? prev : idx));
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; measure(); });
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const value = useMemo<LifecycleContextValue>(() => ({
    state,
    activeIndex,
    capability,
    quality,
    downgrade: () => {
      setQuality((q) => {
        const next = q === 'high' ? 'medium' : q === 'medium' ? 'low' : 'static';
        state.current.quality = next;
        if (typeof document !== 'undefined') document.body.dataset.quality = next;
        return next;
      });
    },
  }), [activeIndex, capability, quality]);

  return <LifecycleContext.Provider value={value}>{children}</LifecycleContext.Provider>;
}

export function useLifecycle(): LifecycleContextValue {
  const ctx = useContext(LifecycleContext);
  if (!ctx) throw new Error('useLifecycle precisa estar dentro de <LifecycleProvider>');
  return ctx;
}

export function useActiveSection() {
  const { activeIndex } = useLifecycle();
  return SECTIONS[activeIndex] ?? SECTIONS[0];
}
