import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3001,
    host: '0.0.0.0'
  },
  preview: {
    port: 4173,
    host: '0.0.0.0'
  }
})
