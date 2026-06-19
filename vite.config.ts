import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = (
    process.env.VITE_DEV_API_PORT ||
    env.VITE_DEV_API_PORT ||
    '8001'
  ).trim()

  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_'],
    // `react-router` uses `import { parse } from "cookie"` while `cookie` is CJS. If we
    // exclude the router from `optimizeDeps`, Vite serves raw `cookie` to the browser and
    // named ESM imports break ("does not provide an export named 'parse'"). Pre-bundle
    // `cookie` + router packages so interop is applied (see remix-run/react-router#13949).
    optimizeDeps: {
      include: ['cookie', 'react-router', 'react-router-dom'],
    },
    resolve: {
      dedupe: ['react-router', 'react-router-dom', 'cookie'],
    },
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
