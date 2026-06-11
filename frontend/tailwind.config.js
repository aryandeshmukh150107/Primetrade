/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        trade: {
          bg: '#F0F3F6',
          surface: '#FFFFFF',
          border: '#E0E3EB',
          'border-hover': '#B2B5BE',
          buy: '#089981',
          'buy-hover': '#07846F',
          'buy-light': '#E8F8F5',
          sell: '#F23645',
          'sell-hover': '#D7303E',
          'sell-light': '#FDF2F3',
          accent: '#2962FF',
          'accent-hover': '#1E4BD8',
          'accent-light': '#E3F2FD',
          text: '#131722',
          'text-secondary': '#707584',
          'text-muted': '#9598A1',
          'text-light': '#B2B5BE',
          orange: '#FF9800',
          'orange-light': '#FFF3E0',
        },
        terminal: {
          bg: '#131722',
          surface: '#1E222D',
          border: '#2A2E39',
          text: '#D1D4DC',
          'text-secondary': '#787B86',
          'text-muted': '#5D606B',
          green: '#089981',
          red: '#F23645',
          blue: '#2962FF',
          orange: '#FF9800',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-down': 'slideDown 0.15s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
