import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

const buildNum = process.env.TOKENTRIM_VERSION;
const version = buildNum ? `${pkg.version}+build.${buildNum}` : pkg.version;

export default defineConfig({
  base: '/TokenTrim/',
  plugins: [react(), tailwindcss()],
  define: {
    __TOKENTRIM_VERSION__: JSON.stringify(version),
  },
  worker: {
    format: 'es',
  },
})
