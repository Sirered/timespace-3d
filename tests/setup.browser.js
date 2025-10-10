// tests/setup.browser.js
import { vi } from 'vitest'

// Optional: keep logs quiet in browser runs
vi.spyOn(console, 'warn').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation((...args) => console.log('[test error]', ...args))
