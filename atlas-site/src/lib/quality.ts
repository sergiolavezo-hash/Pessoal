/**
 * ATLAS — DATA, MAPPED · Qualidade adaptativa (Fase 00, tipado)
 *
 * Decide o orçamento visual ANTES de a cena existir e rebaixa em execução
 * se o aparelho não sustentar. A narrativa não depende do nível: muda a
 * densidade, não o que está sendo contado.
 */
import { budget, type Budget, type QualityLevel } from './tokens';

export interface Capability {
  level: QualityLevel;
  webgl: boolean;
  webgl2: boolean;
  /** Disponibilidade registrada; não será adotado sem ganho medido. */
  webgpu: boolean;
  reducedMotion: boolean;
  coarse: boolean;
}

export function detectCapability(): Capability {
  if (typeof window === 'undefined') {
    return { level: 'static', webgl: false, webgl2: false, webgpu: false, reducedMotion: false, coarse: false };
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;

  let webgl = false;
  let webgl2 = false;
  try {
    const c = document.createElement('canvas');
    webgl2 = !!c.getContext('webgl2');
    webgl = webgl2 || !!c.getContext('webgl');
  } catch {
    /* contexto negado — segue como static */
  }

  const webgpu = 'gpu' in navigator;

  let level: QualityLevel = 'high';
  if (!webgl) level = 'static';
  else if (reducedMotion) level = 'low';
  else if (coarse || cores <= 4 || mem <= 4) level = 'medium';
  if (webgl && coarse && (cores <= 4 || mem <= 4)) level = 'low';

  return { level, webgl, webgl2, webgpu, reducedMotion, coarse };
}

export function budgetFor(level: QualityLevel): Budget {
  return budget[level];
}

export const NEXT_LEVEL_DOWN: Record<QualityLevel, QualityLevel> = {
  high: 'medium',
  medium: 'low',
  low: 'static',
  static: 'static',
};

/**
 * Vigia de quadro: rebaixa um nível se o custo real estourar o orçamento
 * de forma sustentada. Mede a mediana numa janela — um pico durante o
 * scroll não deve degradar a experiência inteira.
 */
export function createFrameWatch(
  onDowngrade: (medianMs: number) => void,
  { sampleSize = 90, budgetMs = 22 }: { sampleSize?: number; budgetMs?: number } = {}
) {
  let samples: number[] = [];
  let last = 0;
  let done = false;

  return function tick(now: number): void {
    if (done) return;
    if (last === 0) { last = now; return; }
    samples.push(now - last);
    last = now;
    if (samples.length < sampleSize) return;
    const median = samples.slice().sort((a, b) => a - b)[Math.floor(sampleSize / 2)];
    samples = [];
    if (median > budgetMs) { done = true; onDowngrade(median); }
  };
}
