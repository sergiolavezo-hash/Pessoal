/**
 * ATLAS — DATA, MAPPED · Contrato das cenas 3D
 *
 * FASE 00 — apenas arquitetura. Nenhuma cena implementada aqui.
 *
 * Todas as cenas vivem no MESMO universo: uma cena não é uma tela, é uma
 * região do espaço que a câmera atravessa. Por isso nenhuma cena cria seu
 * próprio renderer, câmera ou loop — ela recebe o palco e contribui objetos.
 *
 * ---------------------------------------------------------------------
 * CONTRATO
 *
 *   createScene(ctx) -> {
 *     objects,          // THREE.Object3D[] adicionados ao palco
 *     update(state, dt) // chamado por quadro enquanto tiver peso > 0
 *     setQuality(level) // reage a rebaixamento sem recriar a cena
 *     dispose()         // libera geometrias/materiais ao descarregar
 *   }
 *
 *   ctx = { THREE, stage, tokens, budget, chapter }
 *
 * REGRA: `update` só é chamado quando `state.weightOf(chapter) > 0`.
 * Fora disso a cena não custa GPU nem CPU.
 * ---------------------------------------------------------------------
 *
 * Módulos previstos e a que capítulo cada um serve:
 *
 *   DataParticle     — a unidade. Um dado. Base dos campos de partículas.
 *   DataField        — nuvem de eventos dispersos            → 01 origin
 *   DataSource       — fonte que registra eventos (ERP, CRM) → 02 capture
 *   DataFlow         — corrente de dados entre dois pontos   → 02 capture
 *   DataPipeline     — corredor com ingestão/processamento   → 03 pipeline
 *   DataRepository   — arquivo: lake, warehouse, lakehouse   → 04 memory
 *   TransformField   — região onde o caos vira estrutura     → 05 transformation
 *   SemanticGraph    — nós = entidades, arestas = relações   → 06 context
 *   AnalyticsScene   — a rede se organiza em indicadores     → 07 information
 *   PatternScene     — clusters, anomalias, previsão         → 08 intelligence
 *   DecisionScene    — a câmera sai; sobra uma escolha       → 09 decision
 *   CycleScene       — a ação vira novo dado; o ciclo fecha  → 10 action
 *
 * Cada um será um arquivo em ./ com a mesma assinatura. Nenhum deles
 * conhece os outros — quem os orquestra é o palco.
 */

/** Registro nome → carregador. Import dinâmico: cena só baixa quando entra em cena. */
export const SCENE_LOADERS = {
  // Fase 01 (o protótipo validado em /atlas.html será portado para cá)
  origin:         () => import('./data-field.js'),
  capture:        () => import('./data-sources.js'),
  pipeline:       () => import('./data-pipeline.js'),

  // Fase 02
  memory:         () => import('./data-repository.js'),
  transformation: () => import('./transform-field.js'),
  context:        () => import('./semantic-graph.js'),

  // Fase 03
  information:    () => import('./analytics-scene.js'),
  intelligence:   () => import('./pattern-scene.js'),

  // Fase 04
  decision:       () => import('./decision-scene.js'),
  action:         () => import('./cycle-scene.js'),
};

/**
 * Carrega sob demanda as cenas próximas da fase atual e descarrega as
 * distantes. Mantém no máximo os capítulos vizinhos vivos — é isto que
 * impede o custo de crescer com o tamanho da narrativa.
 */
export function createSceneManager(ctx, { radius = 1 } = {}) {
  const live = new Map();   // id -> instância
  const loading = new Set();

  async function ensure(id) {
    if (live.has(id) || loading.has(id) || !SCENE_LOADERS[id]) return;
    loading.add(id);
    try {
      const mod = await SCENE_LOADERS[id]();
      if (typeof mod.createScene !== 'function') return;
      const scene = mod.createScene({ ...ctx, chapter: id });
      scene.objects.forEach((o) => ctx.stage.add(o));
      live.set(id, scene);
    } catch (e) {
      // Uma cena que não carrega não pode derrubar a narrativa:
      // o capítulo continua existindo em HTML.
      console.warn('[atlas] cena indisponível:', id, e);
    } finally {
      loading.delete(id);
    }
  }

  function drop(id) {
    const scene = live.get(id);
    if (!scene) return;
    scene.objects.forEach((o) => ctx.stage.remove(o));
    scene.dispose?.();
    live.delete(id);
  }

  return {
    /** Chamado a cada quadro com o estado do ciclo. */
    sync(state, dt) {
      const current = Math.round(state.phase);
      Object.keys(SCENE_LOADERS).forEach((id, i) => {
        const idx = i + 1; // signal ocupa o índice 0 e não tem cena própria
        if (Math.abs(idx - current) <= radius) ensure(id); else drop(id);
      });
      live.forEach((scene, id) => {
        if (state.weightOf(id) > 0) scene.update?.(state, dt);
      });
    },
    setQuality(level) { live.forEach((s) => s.setQuality?.(level)); },
    disposeAll() { [...live.keys()].forEach(drop); },
  };
}
