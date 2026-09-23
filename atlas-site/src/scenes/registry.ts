/**
 * ATLAS — registro de cenas
 *
 * Uma cena não é uma tela: é uma região do território que a câmera
 * atravessa. Por isso nenhuma cena cria renderer, câmera ou loop — ela
 * recebe o palco (o <Canvas>) e contribui objetos.
 *
 * O carregamento é dinâmico: a seção só baixa quando a câmera se
 * aproxima dela. É isto que impede o custo de crescer com a página.
 */
import { lazy, type LazyExoticComponent, type ComponentType } from 'react';
import { SECTIONS, type SectionId } from '../lib/lifecycle';

export interface SceneEntry {
  /** Identidade da cena — duas cenas podem ancorar na mesma seção. */
  id: string;
  /** Seção à qual a cena pertence. */
  chapter: SectionId;
  Component: LazyExoticComponent<ComponentType>;
  /** A quantas seções de distância a cena já deve estar carregada. */
  preloadRadius: number;
}

export const SCENES: SceneEntry[] = [
  {
    id: 'field',
    chapter: 'hero',
    // O campo de partículas não é a cena de uma seção: é o protagonista
    // da página inteira, e a MESMA partícula atravessa todos os
    // territórios. Se desmontasse, as seções seguintes ficariam vazias.
    preloadRadius: SECTIONS.length,
    Component: lazy(() => import('./DataField')),
  },
  {
    id: 'territory',
    chapter: 'hero',
    // A carta também acompanha a página toda — é o chão do território.
    preloadRadius: SECTIONS.length,
    Component: lazy(() => import('./Territory')),
  },
  {
    id: 'sources',
    chapter: 'capture',
    preloadRadius: 1,
    Component: lazy(() => import('./Sources')),
  },
  {
    id: 'decision',
    chapter: 'decide',
    preloadRadius: 1,
    Component: lazy(() => import('./Decision')),
  },
];

export const PHASE_INDEX: Record<SectionId, number> = SECTIONS.reduce(
  (acc, s, i) => { acc[s.id] = i; return acc; },
  {} as Record<SectionId, number>
);

/** Uma cena está em alcance quando a fase atual está dentro do seu raio. */
export function isInRange(entry: SceneEntry, phase: number): boolean {
  return Math.abs(PHASE_INDEX[entry.chapter] - phase) <= entry.preloadRadius;
}
