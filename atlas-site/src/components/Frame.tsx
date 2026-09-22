'use client';

/**
 * Moldura do atlas: marca, coordenadas, progresso e índice de capítulos.
 *
 * O índice mostra os dez capítulos do ciclo, mas só os construídos são
 * navegáveis — o mapa inteiro fica visível para o usuário entender onde
 * está e o que vem depois.
 */
import { CHAPTERS, PHASE_01_CHAPTERS } from '../lib/lifecycle';
import { useLifecycle } from '../lib/useLifecycle';
import styles from './Frame.module.css';

export default function Frame() {
  const { activeIndex } = useLifecycle();
  const current = CHAPTERS[activeIndex];

  return (
    <>
      <header className={styles.top}>
        <a className={styles.brand} href="https://atlas-partner.com/">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <linearGradient id="atlasMark" x1="4" y1="6" x2="96" y2="92" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#6FD4FF" />
                <stop offset="0.5" stopColor="#2E86FF" />
                <stop offset="1" stopColor="#0A2EE0" />
              </linearGradient>
            </defs>
            <path d="M50 58 L64 82 L36 82 Z" fill="#2E9BFF" />
            <path d="M50 6 L94 92 L64.5 92 L50 62 L35.5 92 L6 92 Z" fill="url(#atlasMark)" />
          </svg>
          <b>Atlas</b>
        </a>

        <span className={styles.coords}>23°33′S · 46°38′W</span>

        <p className={styles.progress} aria-live="polite">
          <b>{current?.n != null ? String(current.n).padStart(2, '0') : '—'}</b> / 10
        </p>
      </header>

      <nav aria-label="Capítulos do ciclo">
        <ol className={styles.nav}>
          {CHAPTERS.map((c, i) => {
            const built = PHASE_01_CHAPTERS.includes(c.id);
            return (
              <li key={c.id} className={built ? undefined : styles.pending}>
                <a
                  href={built ? `#${c.id}` : undefined}
                  aria-current={i === activeIndex ? 'step' : undefined}
                  aria-disabled={built ? undefined : true}
                >
                  {c.n != null ? String(c.n).padStart(2, '0') : '··'} {c.label}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
