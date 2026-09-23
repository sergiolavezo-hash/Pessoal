'use client';

/**
 * Navegação comercial: quatro destinos e um CTA.
 *
 * Não reproduz as etapas do ciclo. O visitante que chega querendo saber
 * o que a Atlas vende precisa de Serviços e Cases, não de um índice de
 * capítulos.
 */
import { CONTACT_URL } from '../lib/content';
import styles from './Nav.module.css';

const LINKS = [
  { href: '#servicos', label: 'Serviços' },
  { href: '#cases', label: 'Cases' },
  { href: '#tecnologia', label: 'Tecnologias' },
  { href: '#ciclo', label: 'Como fazemos' },
];

export default function Nav() {
  return (
    <header className={styles.top}>
      <a className={styles.brand} href="#inicio">
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

      <nav className={styles.links} aria-label="Navegação principal">
        {LINKS.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
      </nav>

      <a className={styles.cta} href={CONTACT_URL}>Fale com a Atlas →</a>
    </header>
  );
}
