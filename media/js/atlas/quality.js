/**
 * ATLAS — DATA, MAPPED · Qualidade adaptativa
 *
 * Decide o orçamento visual ANTES de a cena existir, e rebaixa em tempo de
 * execução se o aparelho não sustentar. A narrativa nunca depende do nível:
 * o que muda é a densidade, não o que está sendo contado.
 *
 * Níveis: high · medium · low · static (sem 3D, narrativa editorial)
 */
import { budget } from './tokens.js';

/** Capacidade do renderizador, resolvida uma vez na entrada. */
export function detectCapability() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;

  let webgl = false, webgl2 = false;
  try {
    const c = document.createElement('canvas');
    webgl2 = !!c.getContext('webgl2');
    webgl = webgl2 || !!c.getContext('webgl');
  } catch (e) { /* contexto negado — segue como static */ }

  // WebGPU existe no roadmap, mas só entra quando trouxer ganho real.
  // Registrar a disponibilidade agora evita ter que redesenhar depois.
  const webgpu = typeof navigator !== 'undefined' && 'gpu' in navigator;

  let level = 'high';
  if (!webgl) level = 'static';
  else if (reducedMotion) level = 'low';
  else if (coarse || cores <= 4 || mem <= 4) level = 'medium';
  if (coarse && (cores <= 4 || mem <= 4)) level = 'low';

  return { level, webgl, webgl2, webgpu, reducedMotion, coarse, cores, mem };
}

/** Orçamento numérico do nível — partículas, DPR, instancing, pós-processo. */
export function budgetFor(level) {
  return budget[level] || budget.medium;
}

/**
 * Vigia de quadro: se o custo real passar do aceitável por tempo
 * suficiente, rebaixa um nível. Mede em janela, não em quadro isolado —
 * um pico durante o scroll não deve degradar a experiência inteira.
 */
export function createFrameWatch(onDowngrade, { sampleSize = 90, budgetMs = 22 } = {}) {
  let samples = [];
  let last = performance.now();
  let downgraded = false;

  return function tick() {
    const now = performance.now();
    samples.push(now - last);
    last = now;
    if (samples.length < sampleSize || downgraded) {
      if (samples.length > sampleSize) samples.shift();
      return;
    }
    const median = samples.slice().sort((a, b) => a - b)[Math.floor(sampleSize / 2)];
    samples = [];
    if (median > budgetMs) { downgraded = true; onDowngrade(median); }
  };
}

export const NEXT_LEVEL_DOWN = { high: 'medium', medium: 'low', low: 'static', static: 'static' };
