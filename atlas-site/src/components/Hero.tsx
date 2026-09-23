'use client';

/**
 * A primeira tela precisa vender, não impressionar.
 *
 * Headline, subheadline e dois CTAs em HTML real, com peso tipográfico
 * suficiente para serem lidos mesmo que o visitante ignore o território
 * ao fundo. O 3D aqui é cenário: se ele não carregar, a tela continua
 * dizendo exatamente o que a Atlas faz.
 */
import { CONTACT_URL } from '../lib/content';
import { useLifecycle } from '../lib/useLifecycle';
import ui from './ui.module.css';
import styles from './Hero.module.css';

export default function Hero() {
  const { activeIndex } = useLifecycle();
  return (
    <section
      id="inicio"
      data-section-index={0}
      aria-labelledby="hero-title"
      className={`${ui.section} ${activeIndex === 0 ? ui.active : ''}`}
    >
      <div className={ui.inner}>
        <div className={`${styles.col} ${ui.reveal}`}>
          <p className={ui.eyebrow}>Consultoria de tecnologia e dados</p>

          <h1 id="hero-title" className={styles.headline}>
            Dados, BI, cloud e IA para empresas que precisam escalar.
          </h1>

          <p className={styles.sub}>
            Construímos plataformas de dados, pipelines, dashboards, arquiteturas
            cloud, automações e soluções de IA para transformar dados em operação
            e decisão.
          </p>

          <div className={ui.ctaRow}>
            <a className={`${ui.btn} ${ui.primary}`} href={CONTACT_URL}>Fale com a Atlas →</a>
            <a className={ui.btn} href="#servicos">Ver como podemos ajudar ↓</a>
          </div>
        </div>
      </div>
    </section>
  );
}
