/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        slate: {
          50: "#f8f7fb", 100: "#ebeaf0", 200: "#d4d2db", 300: "#b8b6c2", 400: "#9997a5",
          500: "#7c7a88", 600: "#5f5d68", 700: "#33313a", 800: "#1a1920", 900: "#111116", 950: "#050507"
        },
        indigo: {
          50: "#f3f1ff", 100: "#e7e3ff", 200: "#d1c9ff", 300: "#b8adff", 400: "#c5bcff",
          500: "#a99cff", 600: "#8574f4", 700: "#6f5de1", 800: "#5748b7", 900: "#3f347e", 950: "#211c42"
        }
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["DM Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      }
    }
  },
  plugins: []
};
