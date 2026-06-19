import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = (
    process.env.VITE_DEV_API_PORT ||
    env.VITE_DEV_API_PORT ||
    '8000'
  ).trim()

  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_'],
    server: {
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  }
})
