import type { Metadata } from "next";
import { Inter, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Manrope({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "Atlas Insight AI", template: "%s · Atlas Insight AI" },
  description:
    "Plataforma de análise de dados com IA da Atlas Tecnologia: conecte suas fontes, entenda seu negócio e gere dashboards com inteligência.",
  robots: { index: false }, // app privado — o marketing fica em atlas-partner.com
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
