import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/TokenTrim/',
  plugins: [react(), tailwindcss()],
  worker: {
    format: 'es',
  },
})
