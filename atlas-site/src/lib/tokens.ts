/**
 * ATLAS — DATA, MAPPED · Design tokens (Fase 00, tipado)
 *
 * Fonte única de verdade. Consumido por dois lados: pelo CSS (custom
 * properties em globals.css) e pelas cenas 3D, que precisam dos mesmos
 * valores em formato numérico para materiais e uniforms.
 *
 * Regra: nenhuma cor literal dentro de componente ou cena.
 */

export const color = {
  background: '#05070A',
  surface: '#080B12',
  surfaceRaised: '#0D1118',

  text: '#F2F5F9',
  muted: '#8A94A6',
  dim: '#565F70',

  /** Azul sinaliza fluxo, seleção, estado ativo e conexão — nunca decoração. */
  atlasBlue: '#2E86FF',
  atlasBlueLight: '#9FD4FF',
  atlasBlueDeep: '#0A2EE0',

  border: 'rgba(242, 245, 249, 0.09)',
  borderSoft: 'rgba(242, 245, 249, 0.045)',
  glow: 'rgba(46, 134, 255, 0.45)',
} as const;

/** Os mesmos tons como inteiro, para THREE.Color sem reparse de string. */
export const color3d = {
  background: 0x05070a,
  atlasBlue: 0x2e86ff,
  atlasBlueLight: 0x9fd4ff,
  atlasBlueDeep: 0x0a2ee0,
} as const;

export const motion = {
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
  fade: 0.7,
  /** Quanto a fase persegue o alvo do scroll por quadro. */
  cameraDamping: 0.075,
} as const;

export type QualityLevel = 'high' | 'medium' | 'low' | 'static';

export interface Budget {
  particles: number;
  dpr: number;
  instanced: boolean;
  postFX: boolean;
}

/** Orçamento por nível. Quem escolhe o nível é quality.ts; cenas apenas leem. */
export const budget: Record<QualityLevel, Budget> = {
  high: { particles: 1400, dpr: 2, instanced: true, postFX: true },
  medium: { particles: 900, dpr: 1.75, instanced: true, postFX: false },
  low: { particles: 480, dpr: 1.25, instanced: false, postFX: false },
  static: { particles: 0, dpr: 1, instanced: false, postFX: false },
};
