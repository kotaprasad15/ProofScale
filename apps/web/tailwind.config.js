/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      },
      colors: {
        ink: {
          950: 'var(--ink-950)',
          900: 'var(--ink-900)',
          800: 'var(--ink-800)',
          700: 'var(--ink-800)'
        },
        signal: {
          indigo: 'var(--signal-indigo)',
          'indigo-hover': '#4D51E8',
          'indigo-soft': 'var(--color-brand-soft)',
          teal: 'var(--signal-teal)',
          'teal-soft': 'var(--color-success-soft)',
          amber: 'var(--signal-amber)',
          'amber-soft': 'var(--color-warning-soft)',
          rose: 'var(--signal-rose)',
          'rose-soft': 'var(--color-critical-soft)'
        },
        text: {
          primary: 'var(--text-primary)',
          muted: 'var(--text-muted)',
          faint: 'var(--text-faint)'
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)'
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          inset: 'var(--panel-inset)'
        },
        overlay: 'var(--overlay-bg)',
        'fill-sm': 'var(--white-fill-sm)',
        'fill-md': 'var(--white-fill-md)'
      },
      boxShadow: {
        glass: '0 20px 60px -20px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        'glass-glow': '0 0 30px -5px rgba(91, 95, 239, 0.25)',
        'teal-glow': '0 0 30px -5px rgba(47, 212, 166, 0.25)',
        'rose-glow': '0 0 30px -5px rgba(242, 88, 107, 0.25)'
      }
    }
  },
  plugins: []
};
