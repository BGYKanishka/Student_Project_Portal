import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  // vite.config.js itself runs before Vite's own .env loading populates
  // import.meta.env for the app — process.env here is just the raw shell
  // environment, so client/.env must be loaded explicitly via loadEnv().
  const env = loadEnv(mode, __dirname, '')

  // Opt-in local HTTPS: only enabled when VITE_HTTPS=true AND a cert/key
  // pair exists at ../certs (see README — generate with openssl). Requires
  // an explicit flag, not just file presence, so generating the certs
  // doesn't silently flip an already-running plain-HTTP dev setup.
  const certPath = path.resolve(__dirname, '../certs/cert.pem')
  const keyPath = path.resolve(__dirname, '../certs/key.pem')
  const httpsConfig = env.VITE_HTTPS === 'true' && fs.existsSync(certPath) && fs.existsSync(keyPath)
    ? { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }
    : undefined

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      https: httpsConfig,
    },
  }
})
