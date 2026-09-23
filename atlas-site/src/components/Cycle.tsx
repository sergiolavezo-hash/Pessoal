'use client';

/**
 * O ciclo em uma tela só.
 *
 * Os cinco territórios que o visitante acabou de atravessar, agora vistos
 * juntos — e fechando: a decisão gera dado novo, e a captura recomeça.
 * Cinco linhas, não dez capítulos.
 */
import { TERRITORIES } from '../lib/content';
import Section from './Section';
import Cta from './Cta';
import ui from './ui.module.css';

const WHAT: Record<string, string> = {
  capture: 'O dado entra no sistema, venha de onde vier.',
  organize: 'Dado bruto vira base confiável, com padrão e governança.',
  understand: 'A base vira indicador: o negócio passa a ser visível.',
  intelligence: 'A leitura ganha uma camada que projeta e aponta desvios.',
  decide: 'O indicador vira decisão — e a decisão vira ação.',
};

export default function Cycle() {
  return (
    <Section id="ciclo" index={7} tall labelledBy="ciclo-title">
      <div className={ui.reveal}>
        <p className={ui.eyebrow}>Como entregamos</p>
        <h2 id="ciclo-title" className={ui.h2}>Como a Atlas transforma dados em decisão.</h2>
        <p className={ui.lede}>
          Cinco territórios. Cada projeto entra em um deles e caminha até o
          próximo — e nenhum termina no relatório.
        </p>

        <div className={ui.cycle}>
          {TERRITORIES.map((t) => (
            <div key={t.id} className={ui.cycleStep}>
              <p className={ui.cycleN}>{t.code}</p>
              <p className={ui.cycleName}>{t.stage}</p>
              <p className={ui.cycleWhat}>{WHAT[t.id]}</p>
            </div>
          ))}
        </div>

        <p className={ui.cycleClose}>Decisão → dado novo → captura. O ciclo não para.</p>
        <div className={ui.ctaRow}><Cta label="Fale com a Atlas" /></div>
      </div>
    </Section>
  );
}
