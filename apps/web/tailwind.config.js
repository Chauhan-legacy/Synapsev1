/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        playfair: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        cream: '#F8F6F1',
        card: '#FFFDF9',
        line: '#E6E1D6',
        ink: '#10141C',
        amber: {
          DEFAULT: '#B45F1B',
          500: '#B45F1B',
          600: '#964E14',
        },
        green: {
          DEFAULT: '#2F7D4F',
          500: '#2F7D4F',
          600: '#25653F',
        },
        teal: {
          DEFAULT: '#4F8A8B',
          500: '#4F8A8B',
        },
        ember: {
          DEFAULT: '#E8590C',
          light: '#FF6B1A',
          dark: '#C94A06',
        },
        synapse: {
          950: '#05070a',
          900: '#090d14',
          850: '#0d131d',
          800: '#121927',
          700: '#1a2436',
          600: '#26344d',
          cyan: '#00f0ff',
          neon: '#38bdf8',
          violet: '#818cf8',
        }
      }
    },
  },
  plugins: [],
}

