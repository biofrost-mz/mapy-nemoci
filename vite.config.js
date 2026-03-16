import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
  },
  optimizeDeps: {
    // pdfjs-dist is loaded dynamically only on PDF import; prebundling it slows/hangs dev startup.
    exclude: ['pdfjs-dist'],
  },
  // base: '/epi-map/', // ← odkomentuj a uprav pokud nasazuješ do podsložky
})
