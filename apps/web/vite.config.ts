import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@resumetailor/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@resumetailor/types": path.resolve(__dirname, "../../packages/types/src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
