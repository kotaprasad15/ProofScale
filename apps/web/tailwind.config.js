/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      },
      colors: {
        ink: {
          950: '#0A0E16',
          900: '#10151F',
          800: '#181F2E',
          700: '#242D40'
        },
        signal: {
          indigo: '#5B5FEF',
          'indigo-hover': '#4D51E8',
          'indigo-soft': 'rgba(91, 95, 239, 0.12)',
          teal: '#2FD4A6',
          'teal-soft': 'rgba(47, 212, 166, 0.12)',
          amber: '#F0A63A',
          'amber-soft': 'rgba(240, 166, 58, 0.12)',
          rose: '#F2586B',
          'rose-soft': 'rgba(242, 88, 107, 0.12)'
        },
        text: {
          primary: '#F3F5FA',
          muted: '#8D96AC',
          faint: '#5C6478'
        }
      },
      boxShadow: {
        glass: '0 20px 60px -20px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        'glass-glow': '0 0 30px -5px rgba(91, 95, 239, 0.25)',
        'teal-glow': '0 0 30px -5px rgba(47, 212, 166, 0.25)',
        'rose-glow': '0 0 30px -5px rgba(242, 88, 107, 0.25)'
      }
      }
    }
  },
  plugins: []
};
