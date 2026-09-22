import type { Metadata, Viewport } from 'next';
import { Manrope, Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

/**
 * next/font baixa e auto-hospeda as fontes no build: sem requisição ao
 * Google em runtime, sem CSP extra, sem layout shift.
 */
const display = Manrope({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-display', display: 'swap' });
const body = Inter({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-body', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Atlas Tecnologia | Data Engineering, BI, Cloud e IA',
  description:
    'Data Engineering, Business Intelligence, Cloud, Artificial Intelligence e Automation para empresas que precisam transformar dados em decisões.',
  // Protótipo da Fase 01: fora do índice até a experiência estar completa.
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Atlas — Data, Mapped.',
    description: 'Da origem à decisão, construímos a infraestrutura que transforma dados em informação, inteligência e resultado.',
    type: 'website',
    locale: 'pt_BR',
  },
};

export const viewport: Viewport = {
  themeColor: '#05070A',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
