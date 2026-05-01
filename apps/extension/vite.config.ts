import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      "@resumetailor/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@resumetailor/types": path.resolve(__dirname, "../../packages/types/src"),
      "@resumetailor/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@resumetailor/ai-pipeline": path.resolve(__dirname, "../../packages/ai-pipeline/src"),
    },
  },
  server: {
    port: 5180,
    strictPort: true,
    host: "localhost",
    cors: true,
    hmr: {
      host: "localhost",
      protocol: "ws",
    },
  },
})
