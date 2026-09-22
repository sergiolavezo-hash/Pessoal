'use client';

/**
 * Um capítulo do ciclo, em HTML semântico.
 *
 * Regra de acessibilidade da Fase 00: nenhuma informação crítica existe
 * só no canvas. Headline, texto e a lista de entidades ficam aqui, num
 * <section> real, alcançável por teclado e por leitor de tela.
 */
import { useLifecycle } from '../lib/useLifecycle';
import styles from './Chapter.module.css';

interface ChapterProps {
  id: string;
  /** Posição no eixo do ciclo — o scroll lê isto para calcular a fase. */
  index: number;
  /** Número exibido (01, 02…). O sinal inicial não tem. */
  number?: number;
  label: string;
  headline: string;
  lede: string;
  /** Entidades reais do capítulo: eventos, fontes ou etapas. */
  meta?: string[];
  children?: React.ReactNode;
}

export default function Chapter({
  id, index, number, label, headline, lede, meta, children,
}: ChapterProps) {
  const { activeIndex } = useLifecycle();
  const isActive = activeIndex === index;

  return (
    <section
      id={id}
      data-chapter-index={index}
      aria-labelledby={`${id}-headline`}
      className={`${styles.chapter} ${isActive ? styles.active : ''}`}
    >
      <div className={styles.inner}>
        <div className={styles.col}>
          <p className={styles.label}>
            {number != null ? `${String(number).padStart(2, '0')} / ` : ''}{label}
          </p>
          <h2 id={`${id}-headline`} className={styles.headline}>{headline}</h2>
          <p className={styles.lede}>{lede}</p>
          {meta && (
            <ul className={styles.meta}>
              {meta.map((m) => <li key={m}>{m}</li>)}
            </ul>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
