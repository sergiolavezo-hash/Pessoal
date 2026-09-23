'use client';

/**
 * Um território do ciclo.
 *
 * A tela entra pela porta do problema do visitante, responde com o que a
 * Atlas faz, nomeia o serviço e pede a ação. Problema → solução →
 * serviço → CTA, na mesma tela: separar "problemas" de "processo" faria
 * o visitante ler duas vezes o mesmo assunto.
 */
import type { Territory } from '../lib/content';
import type { ReactNode } from 'react';
import Section from './Section';
import Cta from './Cta';
import ui from './ui.module.css';

export default function TerritorySection({
  territory, index, children,
}: { territory: Territory; index: number; children?: ReactNode }) {
  const t = territory;
  return (
    <Section id={t.id} index={index} labelledBy={`${t.id}-title`}>
      <div className={`${ui.col} ${ui.reveal}`}>
        <p className={ui.eyebrow}>{t.code} / {t.stage}</p>
        <h2 id={`${t.id}-title`} className={ui.h2}>{t.problem}</h2>
        <p className={ui.lede}>{t.answer}</p>
        {children}
        <ul className={ui.chips}>
          {t.items.map((i) => <li key={i}>{i}</li>)}
        </ul>
        <p className={ui.serviceLine}>{t.services.join(' · ')}</p>
        <div className={ui.ctaRow}><Cta label={t.cta} /></div>
      </div>
    </Section>
  );
}
