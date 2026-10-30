import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#3E2A21',
        charcoal: '#2E211B',
        slate: '#766B60',
        mist: '#F5F0E9',
        mint: '#567C5A',
        amber: '#B87932',
        crimson: '#A33B32',
        coffee: '#3E2A21',
        stone: '#766B60',
        cream: '#F7F2E9',
        lounge: '#315B45',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: { '4xl': '2rem' },
      boxShadow: {
        card: '0 1px 2px rgba(62,42,33,0.04), 0 8px 24px rgba(62,42,33,0.06)',
        lift: '0 12px 40px rgba(46,33,27,0.16)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s linear infinite',
        floaty: 'floaty 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
