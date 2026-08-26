import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env": {}
  },
  server: {
    port: 3000,
    proxy: {
      "/trpc": {
        target: "http://localhost:3001",
        changeOrigin: true
      }
    }
  }
});
