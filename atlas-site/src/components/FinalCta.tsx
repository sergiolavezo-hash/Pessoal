'use client';

/**
 * O fim da página é um pedido, não um resumo.
 */
import Section from './Section';
import Cta from './Cta';
import ui from './ui.module.css';

export default function FinalCta() {
  return (
    <Section id="contato" index={10} labelledBy="cta-title">
      <div className={`${ui.col} ${ui.reveal}`}>
        <p className={ui.eyebrow}>Atlas Tecnologia</p>
        <h2 id="cta-title" className={ui.h2}>Seus dados podem fazer mais.</h2>
        <p className={ui.lede}>
          Conte-nos o problema. Nós construímos o caminho.
        </p>
        <div className={ui.ctaRow}><Cta label="Falar com a Atlas" /></div>
      </div>
    </Section>
  );
}
