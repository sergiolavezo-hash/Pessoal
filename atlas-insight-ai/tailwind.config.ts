import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#0A0A0C', subtle: '#101013' },
        panel: { DEFAULT: '#16161A', 2: '#1C1C22' },
        line: { DEFAULT: 'rgba(244,243,239,0.09)', soft: 'rgba(244,243,239,0.055)' },
        ink: { DEFAULT: '#F4F3EF', muted: '#A2A2AB', dim: '#6E6E78' },
        accent: { DEFAULT: '#00E7C4', deep: '#00A78F', ink: '#01302A' },
        chart: { a: '#00A78F', b: '#7B84DB' },
        danger: '#FF7A6B',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: { card: '14px' },
    },
  },
  plugins: [],
} satisfies Config;
