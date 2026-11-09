/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
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

