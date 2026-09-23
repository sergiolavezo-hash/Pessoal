'use client';

/**
 * ATLAS — a página comercial.
 *
 * A ordem é o argumento: o visitante descobre o que a Atlas vende na
 * segunda tela, se reconhece nos cinco problemas que vêm depois, vê o
 * ciclo fechar, lê a prova e é convidado a falar. O território 3D
 * atravessa tudo como cenário — ele ilustra, nunca é a única fonte de
 * informação.
 */
import dynamic from 'next/dynamic';
import Nav from '../components/Nav';
import Hero from '../components/Hero';
import Services from '../components/Services';
import TerritorySection from '../components/TerritorySection';
import Example from '../components/Example';
import Cycle from '../components/Cycle';
import Cases from '../components/Cases';
import Technology from '../components/Technology';
import FinalCta from '../components/FinalCta';
import { TERRITORIES } from '../lib/content';
import { LifecycleProvider } from '../lib/useLifecycle';

/**
 * Three.js e R3F não entram no bundle inicial: a headline é o conteúdo
 * principal e não deve esperar pela biblioteca 3D. O canvas chega depois,
 * por import dinâmico, e nunca é renderizado no servidor.
 */
const AtlasCanvas = dynamic(() => import('../components/AtlasCanvas'), { ssr: false });

/** Peças ilustrativas de dois territórios, marcadas como exemplo. */
const FIGURES: Record<string, React.ReactNode> = {
  understand: <Example value="R$ 1.200" caption="sozinho, é só um número" />,
  decide: (
    <Example
      value="Estoque crítico"
      detail={['Loja 042', 'Produto 182', 'Redistribuir 320 un.']}
      caption="uma decisão que vira ação automatizada"
    />
  ),
};

export default function Page() {
  return (
    <LifecycleProvider>
      <a className="skip-link" href="#servicos">Pular para o conteúdo</a>

      <AtlasCanvas />
      <div className="scrim" aria-hidden="true" />

      <Nav />

      <main>
        <Hero />
        <Services />

        {TERRITORIES.map((t, i) => (
          <TerritorySection key={t.id} territory={t} index={2 + i}>
            {FIGURES[t.id]}
          </TerritorySection>
        ))}

        <Cycle />
        <Cases />
        <Technology />
        <FinalCta />
      </main>
    </LifecycleProvider>
  );
}
