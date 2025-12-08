import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5174,
    host: true,
    strictPort: true, // Fail if port is already in use
    hmr: {
      port: 5174, // Use the same port for HMR WebSocket
      protocol: 'ws',
      host: 'localhost'
    }
  }
})