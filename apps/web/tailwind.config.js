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
        page: 'var(--color-bg-page)',
        panel: 'var(--color-bg-panel)',
        tint: 'var(--color-bg-tint)',
        line: 'var(--color-border)',
        ink: 'var(--color-text-ink)',
        muted: 'var(--color-text-muted)',
        teal: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          subtle: 'var(--color-accent-subtle)',
          border: 'var(--color-accent-border)',
        },
        sage: {
          DEFAULT: 'var(--color-sage)',
          dark: 'var(--color-sage-dark)',
        },
        cream: {
          DEFAULT: 'var(--color-cream)',
          border: 'var(--color-cream-border)',
        },
        status: {
          success: 'var(--color-status-success)',
          warning: 'var(--color-status-warning)',
          error: 'var(--color-status-error)',
          info: 'var(--color-status-info)',
        },
        series: {
          1: '#0072B2',
          2: '#E69F00',
          3: '#009E73',
          4: '#D55E00',
          5: '#7B5EA7',
          6: '#56B4E9',
          7: '#CC79A7',
          8: '#B8960C',
        },
      },
    },
  },
  plugins: [],
}
