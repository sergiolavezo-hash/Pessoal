'use client';

/**
 * ATLAS — DATA, MAPPED · Fase 01
 *
 * Quatro capítulos: sinal, origem, captura, pipeline. Uma narrativa
 * contínua percorrida pelo scroll, com um único universo 3D ao fundo.
 *
 * Todo o conteúdo vive em HTML real. O canvas ilustra; ele nunca é a
 * única fonte de informação.
 */
import dynamic from 'next/dynamic';
import Frame from '../components/Frame';
import Hero from '../components/Hero';
import Chapter from '../components/Chapter';
import { LifecycleProvider } from '../lib/useLifecycle';

/**
 * Three.js e R3F não entram no bundle inicial: o texto do hero é o
 * conteúdo principal e não deve esperar pela biblioteca 3D. O canvas
 * chega depois, por import dinâmico, e nunca é renderizado no servidor
 * (precisa de WebGL, que não existe lá).
 */
const AtlasCanvas = dynamic(() => import('../components/AtlasCanvas'), { ssr: false });

export default function Page() {
  return (
    <LifecycleProvider>
      <a className="skip-link" href="#origin">Pular para o conteúdo</a>

      <AtlasCanvas />
      <div className="scrim" aria-hidden="true" />

      <Frame />

      <main>
        <Hero />

        <Chapter
          id="origin"
          index={1}
          number={1}
          label="Origem"
          headline="Tudo começa com um sinal."
          lede="Dados nascem a cada segundo, em sistemas, pessoas, dispositivos e operações. Cada ponto aqui é um evento que acabou de acontecer."
          meta={['Compra', 'Login', 'Pedido', 'Sensor', 'API', 'Documento']}
        />

        <Chapter
          id="capture"
          index={2}
          number={2}
          label="Captura"
          headline="O dado está em todo lugar."
          lede="Fontes diferentes. Formatos diferentes. Um único desafio: conectar tudo. Os eventos se agrupam nos sistemas que os registram."
          meta={['ERP', 'CRM', 'Banco de dados', 'API', 'Aplicação', 'Sensor', 'Arquivo', 'Streaming']}
        />

        <Chapter
          id="pipeline"
          index={3}
          number={3}
          label="Pipeline"
          headline="O dado precisa de um caminho."
          lede="Ingestão, processamento e transformação. O corredor estreita onde o dado é tratado — é ali que ele passa a ser confiável."
          meta={['Ingestão', 'Processamento', 'Transformação']}
        />
      </main>
    </LifecycleProvider>
  );
}
