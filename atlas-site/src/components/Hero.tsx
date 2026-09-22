'use client';

/**
 * 00 / SIGNAL — a abertura.
 *
 * Silêncio, espaço e um sinal. Nesta fase do ciclo o campo de partículas
 * está quase todo colapsado no centro: o usuário vê um ponto e deveria
 * querer saber o que ele é.
 */
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section
      id="signal"
      data-chapter-index={0}
      aria-labelledby="signal-headline"
      className={styles.hero}
    >
      <div className={styles.inner}>
        <div className={styles.col}>
          <p className={styles.signal}><i aria-hidden="true" /> Data / 000001</p>

          <h1 id="signal-headline" className={styles.headline}>
            Dados, <em>mapeados</em>.
          </h1>

          <p className={styles.sub}>Da origem à decisão</p>

          <p className={styles.lede}>
            Da origem à decisão, construímos a infraestrutura que transforma
            dados em informação, inteligência e resultado.
          </p>

          <div className={styles.ctas}>
            <a className={`${styles.btn} ${styles.primary}`} href="#origin">
              Percorrer o ciclo do dado →
            </a>
            <a className={styles.btn} href="https://atlas-partner.com/#contato">
              Fale com a Atlas →
            </a>
          </div>
        </div>
      </div>

      <p className={styles.cue}><i aria-hidden="true" /> Role para começar</p>
    </section>
  );
}
