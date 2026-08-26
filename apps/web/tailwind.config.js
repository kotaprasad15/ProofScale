/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace']
      },
      colors: {
        canvas: '#F7F7FB',
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F1F1F7'
        },
        ink: {
          DEFAULT: '#10142A',
          muted: '#6D7184'
        },
        brand: {
          DEFAULT: '#6957E8',
          hover: '#5444D9',
          soft: '#EEEAFE',
          glow: '#C3B9FD'
        },
        success: {
          DEFAULT: '#129B78',
          soft: '#E8F7F1'
        },
        warning: {
          DEFAULT: '#A66F1C',
          soft: '#FFF7E5'
        },
        danger: {
          DEFAULT: '#C2415A',
          soft: '#FDECEF'
        },
        cardborder: '#E7E7F0'
      },
      boxShadow: {
        soft: '0 8px 28px rgba(16, 20, 42, 0.04)',
        elevated: '0 16px 40px rgba(16, 20, 42, 0.08)',
        brand: '0 12px 32px rgba(105, 87, 232, 0.22)'
      }
      }
    }
  },
  plugins: []
};
