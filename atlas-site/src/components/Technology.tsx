'use client';

/**
 * Tecnologia como prova de capacidade, não como parede de logos.
 * Agrupada por função, em texto — a escolha do stack é consequência do
 * problema, e é isso que a seção diz.
 */
import { SECTORS, TECHNOLOGY } from '../lib/content';
import Section from './Section';
import ui from './ui.module.css';

export default function Technology() {
  return (
    <Section id="tecnologia" index={9} tall labelledBy="tec-title">
      <div className={ui.reveal}>
        <p className={ui.eyebrow}>Atlas / Technology</p>
        <h2 id="tec-title" className={ui.h2}>Tecnologia não é o fim. É o meio.</h2>
        <p className={ui.lede}>
          Somos agnósticos de tecnologia. Escolhemos o stack de acordo com o
          problema, não o contrário.
        </p>

        <div className={ui.techGrid}>
          {TECHNOLOGY.map((g) => (
            <div key={g.group} className={ui.techGroup}>
              <h3>{g.group}</h3>
              <ul>{g.items.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          ))}
        </div>

        <p className={ui.subhead}>Setores onde já transformamos dados em decisão</p>
        <ul className={ui.chips}>
          {SECTORS.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>
    </Section>
  );
}
