/**
 * ATLAS — DATA, MAPPED · Modelo de estado do ciclo de vida
 *
 * Um único eixo numérico (`phase`) descreve onde o dado está na narrativa.
 * Tudo o mais — câmera, comportamento das partículas, quais estruturas
 * estão visíveis, qual texto está ativo — é função desse número.
 *
 * Por que um número e não uma máquina de estados: a transição entre
 * capítulos precisa ser contínua (o scroll para no meio do caminho), e
 * estados discretos não interpolam.
 */

/** Os dez capítulos do ciclo. A ordem é o contrato. */
export const CHAPTERS = [
  { id: 'signal',        n: null, label: 'Sinal',          en: 'SIGNAL' },
  { id: 'origin',        n: 1,    label: 'Origem',         en: 'ORIGIN' },
  { id: 'capture',       n: 2,    label: 'Captura',        en: 'CAPTURE' },
  { id: 'pipeline',      n: 3,    label: 'Pipeline',       en: 'PIPELINE' },
  { id: 'memory',        n: 4,    label: 'Memória',        en: 'MEMORY' },
  { id: 'transformation',n: 5,    label: 'Transformação',  en: 'TRANSFORMATION' },
  { id: 'context',       n: 6,    label: 'Contexto',       en: 'CONTEXT' },
  { id: 'information',   n: 7,    label: 'Informação',     en: 'INFORMATION' },
  { id: 'intelligence',  n: 8,    label: 'Inteligência',   en: 'INTELLIGENCE' },
  { id: 'decision',      n: 9,    label: 'Decisão',        en: 'DECISION' },
  { id: 'action',        n: 10,   label: 'Ação',           en: 'ACTION' },
];

/** Índice do capítulo por id — as cenas se registram por nome, não por número. */
export const PHASE = CHAPTERS.reduce((acc, c, i) => { acc[c.id] = i; return acc; }, {});

/**
 * Estado compartilhado. Cenas leem; apenas o controlador de scroll escreve.
 * Deliberadamente sem framework: é um objeto e uma lista de ouvintes.
 */
export function createLifecycleState() {
  let phase = 0;        // posição contínua no ciclo (0 … CHAPTERS.length-1)
  let target = 0;       // para onde o scroll aponta (a fase persegue isto)
  let quality = 'high';
  const listeners = new Set();

  const emit = () => listeners.forEach((fn) => fn(api));

  const api = {
    get phase() { return phase; },
    get target() { return target; },
    get quality() { return quality; },
    get chapter() { return CHAPTERS[Math.round(phase)]; },

    setTarget(v) {
      target = Math.max(0, Math.min(CHAPTERS.length - 1, v));
      emit();
    },
    /** Avança a interpolação um quadro. Retorna true se ainda há movimento. */
    step(damping) {
      const d = target - phase;
      if (Math.abs(d) < 0.0005) { phase = target; return false; }
      phase += d * damping;
      return true;
    },
    setQuality(q) { quality = q; emit(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    /** Peso de um capítulo na fase atual: 1 no centro, 0 a um capítulo de distância.
        É assim que cada cena decide o quanto de si mostrar. */
    weightOf(id) {
      const i = PHASE[id];
      return i == null ? 0 : Math.max(0, 1 - Math.abs(phase - i));
    },
  };

  return api;
}
