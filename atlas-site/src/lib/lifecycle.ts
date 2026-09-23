/**
 * ATLAS — DATA, MAPPED · Modelo de estado do ciclo
 *
 * Um único eixo numérico descreve onde o visitante está na página.
 * Câmera, partículas e conteúdo são função desse número.
 *
 * Contínuo, não discreto: o scroll para no meio do caminho, e estados
 * discretos não interpolam. O modelo (phase, stepPhase, weightOf) é o
 * mesmo desde a Fase 00 — o que mudou na 01.5 foi a LISTA de seções,
 * porque a página deixou de ser uma narrativa de dez capítulos e passou
 * a ser um argumento comercial com cinco territórios dentro dele.
 */

export type SectionId =
  | 'hero' | 'services'
  | 'capture' | 'organize' | 'understand' | 'intelligence' | 'decide'
  | 'cycle' | 'cases' | 'technology' | 'contact';

export interface Section {
  id: SectionId;
  label: string;
  /** Territórios do ciclo têm cena 3D própria; o resto é fundo calmo. */
  territory: boolean;
}

/**
 * A ordem é o contrato: ela é a ordem no DOM e o eixo do scroll.
 * O visitante encontra o que a Atlas vende (serviços) na segunda tela,
 * e cada território depois disso entra pela porta do problema dele.
 */
export const SECTIONS: Section[] = [
  { id: 'hero', label: 'Início', territory: false },
  { id: 'services', label: 'Serviços', territory: false },
  { id: 'capture', label: 'Capture', territory: true },
  { id: 'organize', label: 'Organize', territory: true },
  { id: 'understand', label: 'Understand', territory: true },
  { id: 'intelligence', label: 'Intelligence', territory: true },
  { id: 'decide', label: 'Decide', territory: true },
  { id: 'cycle', label: 'O ciclo', territory: false },
  { id: 'cases', label: 'Cases', territory: false },
  { id: 'technology', label: 'Tecnologia', territory: false },
  { id: 'contact', label: 'Contato', territory: false },
];

export const PHASE: Record<string, number> = SECTIONS.reduce(
  (acc, s, i) => { acc[s.id] = i; return acc; },
  {} as Record<string, number>
);

/** Índice da primeira e da última tela do ciclo — a câmera viaja aqui. */
export const FIRST_TERRITORY = PHASE.capture;
export const LAST_TERRITORY = PHASE.decide;

/**
 * Estado por referência mutável, não por state do React.
 *
 * Motivo: a fase muda a cada quadro. Guardá-la em useState re-renderizaria
 * a árvore 60×/s. O que precisa re-renderizar (a seção ativa) é derivado
 * e publicado só quando a seção inteira muda.
 */
export interface LifecycleState {
  /** Posição contínua na página (0 … SECTIONS.length-1). */
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
 * Peso de uma seção na fase atual: 1 no centro, 0 a uma seção de
 * distância. É assim que cada cena decide quanto de si mostrar, sem
 * precisar conhecer as outras.
 */
export function weightOf(phase: number, id: SectionId): number {
  const i = PHASE[id];
  return i == null ? 0 : Math.max(0, 1 - Math.abs(phase - i));
}
