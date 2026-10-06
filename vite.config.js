import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/deadline-radar/',
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.js'],
  },
})
