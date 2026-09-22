/**
 * ATLAS — DATA, MAPPED · Registro de cenas (Fase 00, tipado)
 *
 * Uma cena não é uma tela: é uma região do espaço que a câmera atravessa.
 * Por isso nenhuma cena cria renderer, câmera ou loop — ela recebe o palco
 * (o <Canvas>) e contribui objetos.
 *
 * O carregamento é dinâmico: o capítulo só baixa quando a câmera se
 * aproxima dele. É isto que impede o custo de crescer com os dez capítulos.
 */
import { lazy, type LazyExoticComponent, type ComponentType } from 'react';
import type { ChapterId } from '../lib/lifecycle';

export interface SceneEntry {
  /** Capítulo ao qual a cena pertence. */
  chapter: ChapterId;
  Component: LazyExoticComponent<ComponentType>;
  /** A quantos capítulos de distância a cena já deve estar carregada. */
  preloadRadius: number;
}

/**
 * FASE 01 — apenas os capítulos autorizados.
 * Os demais entram nas fases seguintes, sem alterar este contrato.
 */
export const SCENES: SceneEntry[] = [
  {
    chapter: 'origin',
    // Dono do campo de partículas: precisa existir desde o sinal inicial,
    // porque é ele que mostra a primeira partícula do hero.
    preloadRadius: 2,
    Component: lazy(() => import('./DataField')),
  },
  {
    chapter: 'capture',
    preloadRadius: 1,
    Component: lazy(() => import('./DataSources')),
  },
  {
    chapter: 'pipeline',
    preloadRadius: 1,
    Component: lazy(() => import('./DataPipeline')),
  },
];

export const PHASE_INDEX: Record<ChapterId, number> = {
  signal: 0, origin: 1, capture: 2, pipeline: 3,
  memory: 4, transformation: 5, context: 6,
  information: 7, intelligence: 8, decision: 9, action: 10,
};

/** Uma cena está em alcance quando a fase atual está dentro do seu raio. */
export function isInRange(entry: SceneEntry, phase: number): boolean {
  return Math.abs(PHASE_INDEX[entry.chapter] - phase) <= entry.preloadRadius;
}
