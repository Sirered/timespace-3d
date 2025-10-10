import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.node.js',  // node-only setup
    globals: true,
    // Do NOT enable browser here
  },
  resolve: {
    alias: { '/src': path.resolve(__dirname, 'src') },
  },
})
