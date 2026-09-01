import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env": {}
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three", "@react-three/fiber", "@react-three/drei"],
          motion: ["framer-motion"],
          charts: ["recharts"]
        }
      }
    }
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
