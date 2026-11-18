/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', '"Times New Roman"', 'serif'],
        georgia: ['Georgia', '"Times New Roman"', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        page: '#F7F5EF',
        panel: '#FFFFFF',
        tint: '#F7F5EF',
        charcoal: '#252925',
        sage: '#9CAF88',
        signal: '#E8412C',
        line: 'rgba(37, 41, 37, 0.2)',
        ink: '#252925',
        muted: '#252925',
        accent: {
          DEFAULT: '#E8412C',
          hover: '#D03522',
          subtle: 'rgba(232, 65, 44, 0.12)',
          border: '#E8412C',
        },
        status: {
          success: '#9CAF88',
          warning: '#E8412C',
          error: '#E8412C',
          info: '#9CAF88',
        },
      },
    },
  },
  plugins: [],
}
