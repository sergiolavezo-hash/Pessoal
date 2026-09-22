/**
 * ATLAS — DATA, MAPPED · Modelo de estado do ciclo (Fase 00, tipado)
 *
 * Um único eixo numérico descreve onde o dado está na narrativa. Câmera,
 * partículas e conteúdo são função desse número.
 *
 * Contínuo, não discreto: o scroll para no meio do caminho, e estados
 * discretos não interpolam.
 */

export interface Chapter {
  id: ChapterId;
  /** Número exibido no ciclo. O sinal inicial não tem número. */
  n: number | null;
  label: string;
  headline: string;
}

export type ChapterId =
  | 'signal' | 'origin' | 'capture' | 'pipeline'
  | 'memory' | 'transformation' | 'context'
  | 'information' | 'intelligence' | 'decision' | 'action';

/** Os dez capítulos do ciclo. A ordem é o contrato.
 *  FASE 01 implementa apenas os quatro primeiros. */
export const CHAPTERS: Chapter[] = [
  { id: 'signal', n: null, label: 'Sinal', headline: 'Dados, mapeados.' },
  { id: 'origin', n: 1, label: 'Origem', headline: 'Tudo começa com um sinal.' },
  { id: 'capture', n: 2, label: 'Captura', headline: 'O dado está em todo lugar.' },
  { id: 'pipeline', n: 3, label: 'Pipeline', headline: 'O dado precisa de um caminho.' },
  { id: 'memory', n: 4, label: 'Memória', headline: 'O dado precisa de memória.' },
  { id: 'transformation', n: 5, label: 'Transformação', headline: 'Dado bruto não é valor.' },
  { id: 'context', n: 6, label: 'Contexto', headline: 'O dado precisa de significado.' },
  { id: 'information', n: 7, label: 'Informação', headline: 'O dado vira informação.' },
  { id: 'intelligence', n: 8, label: 'Inteligência', headline: 'Padrões viram inteligência.' },
  { id: 'decision', n: 9, label: 'Decisão', headline: 'O dado vira decisão.' },
  { id: 'action', n: 10, label: 'Ação', headline: 'Decisões criam novos dados.' },
];

/** Capítulos com cena construída nesta fase. */
export const PHASE_01_CHAPTERS: ChapterId[] = ['signal', 'origin', 'capture', 'pipeline'];

export const PHASE: Record<string, number> = CHAPTERS.reduce(
  (acc, c, i) => { acc[c.id] = i; return acc; },
  {} as Record<string, number>
);

/**
 * Estado por referência mutável, não por state do React.
 *
 * Motivo: a fase muda a cada quadro. Guardá-la em useState re-renderizaria
 * a árvore 60×/s. O que precisa re-renderizar (o rótulo do capítulo) é
 * derivado e publicado só quando o capítulo inteiro muda.
 */
export interface LifecycleState {
  /** Posição contínua no ciclo (0 … CHAPTERS.length-1). */
  phase: number;
  /** Para onde o scroll aponta; `phase` persegue este valor. */
  target: number;
  quality: import('./tokens').QualityLevel;
}

export function createLifecycle(): LifecycleState {
  return { phase: 0, target: 0, quality: 'high' };
}

/** Avança a interpolação um quadro. */
export function stepPhase(state: LifecycleState, damping: number): void {
  const d = state.target - state.phase;
  state.phase = Math.abs(d) < 0.0005 ? state.target : state.phase + d * damping;
}

/**
 * Peso de um capítulo na fase atual: 1 no centro, 0 a um capítulo de
 * distância. É assim que cada cena decide quanto de si mostrar, sem
 * precisar conhecer as outras.
 */
export function weightOf(phase: number, id: ChapterId): number {
  const i = PHASE[id];
  return i == null ? 0 : Math.max(0, 1 - Math.abs(phase - i));
}
