import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Browser runner for WebGL tests
    browser: {
      enabled: true,
      provider: 'playwright',
      // Vitest v3: define instances instead of browser.name
      instances: [{ browser: 'chromium', headless: true }],
    },
    setupFiles: './tests/setup.browser.js', // browser-safe setup
    include: ['tests/**/*.browser.test.*'], // only browser-tagged tests
    globals: true,
  },
  resolve: {
    alias: { '/src': path.resolve(__dirname, 'src') },
  },
})
