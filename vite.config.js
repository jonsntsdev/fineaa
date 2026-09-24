import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Caminhos relativos permitem abrir o bundle gerado em um servidor estático.
  base: './',
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  plugins: [react()],
})
