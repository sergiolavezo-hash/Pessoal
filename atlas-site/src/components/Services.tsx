'use client';

/**
 * A segunda tela responde "o que a Atlas faz" — antes de qualquer
 * narrativa. Cinco frentes, uma promessa em uma frase e as entregas
 * reais de cada uma.
 *
 * Lista editorial, não parede de cards: cinco cards iguais viram ruído,
 * cinco linhas se leem de cima a baixo.
 */
import { SERVICES } from '../lib/content';
import Section from './Section';
import Cta from './Cta';
import ui from './ui.module.css';

export default function Services() {
  return (
    <Section id="servicos" index={1} tall labelledBy="servicos-title">
      <div className={ui.reveal}>
        <p className={ui.eyebrow}>O que fazemos</p>
        <h2 id="servicos-title" className={ui.h2}>Da infraestrutura de dados à decisão.</h2>
        <p className={ui.lede}>
          Cinco frentes que cobrem o ciclo completo. Não vendemos ferramenta —
          resolvemos o problema por trás dela.
        </p>

        <div className={ui.serviceList}>
          {SERVICES.map((s) => (
            <article key={s.n} className={ui.service}>
              <p className={ui.serviceN}>/{s.n}</p>
              <h3 className={ui.serviceName}>{s.name}</h3>
              <div>
                <p className={ui.servicePromise}>{s.promise}</p>
                <ul className={ui.serviceTags}>
                  {s.delivers.map((d) => <li key={d}>{d}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </div>

        <div className={ui.ctaRow}><Cta label="Fale com a Atlas" /></div>
      </div>
    </Section>
  );
}
