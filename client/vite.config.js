import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

// Load mkcert certificates for HTTPS dev server
const certFile = path.resolve(__dirname, '../certs/localhost+2.pem')
const keyFile = path.resolve(__dirname, '../certs/localhost+2-key.pem')
const hasCerts = fs.existsSync(certFile) && fs.existsSync(keyFile)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    ...(hasCerts && {
      https: {
        key: fs.readFileSync(keyFile),
        cert: fs.readFileSync(certFile),
      },
    }),
    proxy: {
      '/api': {
        target: 'https://localhost:5001',
        changeOrigin: true,
        secure: false, // Allow self-signed certificates
      },
    },
  },
})

