'use client';

/**
 * Prova. Treze projetos reais, com os nomes de cliente preservados por
 * confidencialidade — como no site em produção.
 *
 * Nenhum número aqui foi inventado: métricas, tecnologias e resultados
 * saíram do inventário real do projeto.
 */
import { FLAGSHIP_CASES, MORE_CASES } from '../lib/content';
import Section from './Section';
import Cta from './Cta';
import ui from './ui.module.css';

export default function Cases() {
  return (
    <Section id="cases" index={8} tall labelledBy="cases-title">
      <div className={ui.reveal}>
        <p className={ui.eyebrow}>O que construímos</p>
        <h2 id="cases-title" className={ui.h2}>Resultados que falam por si.</h2>
        <p className={ui.lede}>
          Projetos entregues por especialistas da Atlas — da origem do dado até a
          tomada de decisão.
        </p>

        <div className={ui.caseGrid}>
          {FLAGSHIP_CASES.map((c) => (
            <article key={c.title} className={`${ui.caseCard} ${ui.panel}`}>
              <p className={ui.caseSector}>{c.sector}</p>
              <h3 className={ui.caseTitle}>{c.title}</h3>
              <dl className={ui.caseDl}>
                <div><dt>Problema</dt><dd>{c.problem}</dd></div>
                <div><dt>Solução</dt><dd>{c.solution}</dd></div>
                <div><dt>Stack</dt><dd>{c.stack.join(', ')}</dd></div>
              </dl>
              <div className={ui.caseResults}>
                {c.results?.map((r) => (
                  <p key={r.value} className={ui.caseResult}>
                    <b>{r.value}</b><span>{r.detail}</span>
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <p className={ui.subhead}>Mais projetos entregues</p>
        <div className={ui.moreGrid}>
          {MORE_CASES.map((c) => (
            <article key={c.title} className={`${ui.caseCard} ${ui.panel}`}>
              <p className={ui.caseSector}>{c.sector}</p>
              <h3 className={ui.caseTitle}>{c.title}</h3>
              <p className={ui.caseText}>{c.solution}</p>
              <ul className={ui.serviceTags}>
                {c.stack.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </article>
          ))}
        </div>

        <p className={ui.note}>
          Projetos reais entregues por especialistas Atlas Tec. Nomes de clientes
          preservados por confidencialidade.
        </p>
        <div className={ui.ctaRow}><Cta label="Fale com a Atlas" /></div>
      </div>
    </Section>
  );
}
