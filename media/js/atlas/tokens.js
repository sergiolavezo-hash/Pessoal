/**
 * ATLAS — DATA, MAPPED · Design tokens
 *
 * Fonte única de verdade para cor, tipografia, ritmo e tempo.
 * Consumido por dois lados: pelo CSS (via `injectTokens`, que escreve as
 * custom properties no :root) e pelas cenas 3D, que precisam dos mesmos
 * valores em formato numérico para materiais e uniforms.
 *
 * Regra: nenhuma cor literal no código de cena. Se não estiver aqui, não
 * existe no produto.
 */

export const color = {
  /* superfícies — do mais profundo ao mais próximo */
  background: '#05070A',
  surface: '#080B12',
  surfaceRaised: '#0D1118',

  /* texto */
  text: '#F2F5F9',
  muted: '#8A94A6',
  dim: '#565F70',

  /* Atlas Blue — sinaliza fluxo, seleção, estado ativo e conexão.
     Nunca usado como preenchimento decorativo. */
  atlasBlue: '#2E86FF',
  atlasBlueLight: '#9FD4FF',
  atlasBlueDeep: '#0A2EE0',

  border: 'rgba(242, 245, 249, 0.09)',
  borderSoft: 'rgba(242, 245, 249, 0.045)',
  glow: 'rgba(46, 134, 255, 0.45)',
};

/** Os mesmos tons em inteiro, para THREE.Color sem reparse de string. */
export const color3d = {
  background: 0x05070a,
  atlasBlue: 0x2e86ff,
  atlasBlueLight: 0x9fd4ff,
  atlasBlueDeep: 0x0a2ee0,
};

export const type = {
  display: "'Manrope', system-ui, sans-serif",   // headlines
  body: "'Inter', system-ui, sans-serif",        // leitura
  mono: "'IBM Plex Mono', monospace",            // labels, números, coordenadas
  /* escala editorial: poucos degraus, muito contraste entre eles */
  h1: 'clamp(2.6rem, 7.2vw, 5.4rem)',
  h2: 'clamp(1.9rem, 4.6vw, 3.3rem)',
  lede: 'clamp(1rem, 1.6vw, 1.12rem)',
  label: '0.7rem',
  meta: '0.66rem',
  tracking: { label: '0.24em', meta: '0.16em', brand: '0.16em' },
};

export const space = { gutter: 'clamp(1.1rem, 4vw, 2.6rem)', maxWidth: '1220px', column: '40rem' };

export const motion = {
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
  fade: 0.7,          // s — entrada de texto por capítulo
  cameraDamping: 0.075, // quanto a câmera persegue o scroll por quadro
};

/**
 * Orçamento por nível de qualidade. Quem decide o nível é o detector de
 * capacidade (ver quality.js); as cenas apenas leem estes números.
 */
export const budget = {
  high:   { particles: 1400, dpr: 2,   instanced: true,  postFX: true },
  medium: { particles: 900,  dpr: 1.75, instanced: true,  postFX: false },
  low:    { particles: 480,  dpr: 1.25, instanced: false, postFX: false },
  static: { particles: 0,    dpr: 1,    instanced: false, postFX: false },
};

/** Escreve os tokens como custom properties para o CSS consumir. */
export function injectTokens(target = document.documentElement) {
  const set = (k, v) => target.style.setProperty(k, v);
  set('--bg', color.background);
  set('--surface', color.surface);
  set('--surface-raised', color.surfaceRaised);
  set('--ink', color.text);
  set('--muted', color.muted);
  set('--dim', color.dim);
  set('--accent', color.atlasBlue);
  set('--accent-light', color.atlasBlueLight);
  set('--accent-deep', color.atlasBlueDeep);
  set('--line', color.border);
  set('--line-soft', color.borderSoft);
  set('--glow', color.glow);
  set('--display', type.display);
  set('--body', type.body);
  set('--mono', type.mono);
  set('--ease', motion.ease);
}
