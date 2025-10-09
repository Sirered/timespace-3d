// vitest.config.js
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    globals: true,
  },
  resolve: {
    alias: {
      '/src': path.resolve(__dirname, 'src'), // match your code’s absolute import
    },
  },
})
