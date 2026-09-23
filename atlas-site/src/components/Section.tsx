'use client';

/**
 * O esqueleto de uma seção.
 *
 * Marca a âncora que o scroll lê (data-section-index), aplica o estado
 * ativo que dispara a entrada do conteúdo e nada mais. Cada seção real
 * decide o que põe dentro.
 */
import type { ReactNode } from 'react';
import { useLifecycle } from '../lib/useLifecycle';
import styles from './ui.module.css';

interface Props {
  id: string;
  index: number;
  children: ReactNode;
  /** Seções densas não precisam de uma tela inteira de altura. */
  tall?: boolean;
  labelledBy?: string;
}

export default function Section({ id, index, children, tall, labelledBy }: Props) {
  const { activeIndex } = useLifecycle();
  return (
    <section
      id={id}
      data-section-index={index}
      aria-labelledby={labelledBy}
      className={[styles.section, tall ? styles.tall : '', activeIndex === index ? styles.active : ''].join(' ')}
    >
      <div className={styles.inner}>{children}</div>
    </section>
  );
}
