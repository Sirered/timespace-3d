import { vi } from 'vitest';
import createGL from 'gl';

// Ensure a sane window size for renderer sizing
if (!window.innerWidth) {
  Object.defineProperty(window, 'innerWidth',  { value: 1280, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 720,  writable: true });
}
if (!window.devicePixelRatio) {
  Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true });
}

// jsdom defines getContext but throws "not implemented"
// → always override to supply headless-gl for 'webgl'/'webgl2'
const getContextPatched = function getContext(type) {
  if (type === 'webgl' || type === 'experimental-webgl' || type === 'webgl2') {
    // A tiny 1x1 context is enough for Three.js to initialize
    const gl = createGL(1, 1, { preserveDrawingBuffer: true });
    return gl;
  }
  if (type === '2d') {
    // Minimal 2D stub if anything asks for it
    return {
      canvas: this,
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => {},
      drawImage: () => {},
      fillRect: () => {},
      clearRect: () => {},
    };
  }
  return null;
};

// Patch both HTMLCanvasElement and OffscreenCanvas (if present)
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: getContextPatched,
  writable: true,
});

if (typeof OffscreenCanvas !== 'undefined') {
  Object.defineProperty(OffscreenCanvas.prototype, 'getContext', {
    value: getContextPatched,
    writable: true,
  });
}

// Optional: quieten console noise during tests
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation((...args) => {
  // Keep real errors visible if you prefer:
  console.log('[test error]', ...args);
});
