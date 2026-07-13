import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Site palette — cinematic dark
        ink: {
          950: '#050507',
          900: '#0a0a0f',
          800: '#111118',
          700: '#1a1a23',
          600: '#24242f',
          500: '#2e2e3d',
        },
        stone: {
          DEFAULT: '#f2f2f5',
          muted: '#9ca3af',
          subtle: '#6b7280',
          faint: '#374151',
        },
        // Primary accent — crimson, refined not garish
        crimson: {
          DEFAULT: '#be123c',
          hover: '#9f1239',
          faint: 'rgba(190,18,60,0.12)',
          border: 'rgba(190,18,60,0.3)',
        },
        // Ratings accent — warm amber
        gold: {
          DEFAULT: '#d97706',
          light: '#fbbf24',
          faint: 'rgba(217,119,6,0.15)',
        },
        // Borders
        border: {
          DEFAULT: 'rgba(255,255,255,0.07)',
          strong: 'rgba(255,255,255,0.12)',
        },
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        DEFAULT: '0.375rem',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
        'card-hover': '0 4px 24px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.4)',
        'glow-crimson': '0 0 24px rgba(190,18,60,0.15)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}

export default config
