/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // New Morphism tokens
        text1: 'var(--text-1)',
        text2: 'var(--text-2)',
        text3: 'var(--text-3)',
        accent: {
          DEFAULT: 'var(--accent)',
          2: 'var(--accent-2)',
          soft: 'var(--accent-soft)',
        },
        mint: 'var(--mint)',
        ok: 'var(--success)',
        warn: 'var(--warning)',
        danger: 'var(--danger)',
        glass: {
          DEFAULT: 'var(--glass)',
          strong: 'var(--glass-strong)',
          border: 'var(--glass-border)',
        },
        surface2: 'var(--surface)',
        'surface-solid': 'var(--surface-solid)',
        'surface-raised': 'var(--surface-raised)',
        field2: 'var(--field)',
        // Legacy aliases — keep old class names rendering correctly
        ink: {
          950: 'var(--bg-0)',
          900: 'var(--surface-solid)',
          800: 'var(--bg-1)',
          700: 'var(--bg-1)',
        },
        signal: {
          indigo: 'var(--accent)',
          'indigo-hover': 'var(--accent)',
          'indigo-soft': 'var(--accent-soft)',
          teal: 'var(--success)',
          'teal-soft': 'var(--success-soft)',
          amber: 'var(--warning)',
          'amber-soft': 'var(--warning-soft)',
          rose: 'var(--danger)',
          'rose-soft': 'var(--danger-soft)',
        },
        text: {
          primary: 'var(--text-1)',
          muted: 'var(--text-2)',
          faint: 'var(--text-3)',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        surface: {
          DEFAULT: 'var(--surface-solid)',
          inset: 'var(--field)',
        },
        overlay: 'var(--overlay)',
        'fill-sm': 'var(--accent-soft)',
        'fill-md': 'var(--accent-soft)',
      },
      boxShadow: {
        glass: 'var(--shadow-panel)',
        'glass-glow': 'var(--glow-accent)',
        'teal-glow': 'var(--glow-success)',
        'rose-glow': 'var(--glow-danger)',
        inset: 'var(--inset-shadow)',
      },
      borderRadius: {
        '2.5xl': '20px',
      },
    },
  },
  plugins: [],
};
