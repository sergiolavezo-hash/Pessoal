import type { NextConfig } from 'next';

/**
 * Export estático: o build gera HTML/JS puros em out/, publicados na
 * mesma branch gh-pages do site atual. Sem servidor novo, sem mudar
 * infraestrutura.
 *
 * basePath /v2 — a experiência vive num subcaminho enquanto o site
 * atual continua no ar na raiz.
 */
const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/v2',
  assetPrefix: '/v2',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
