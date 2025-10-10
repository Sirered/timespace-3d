// tests/setup.js
import { vi } from 'vitest';

const USE_FAKE = process.env.USE_FAKE_WEBGL === '1' || process.env.CI === 'true';
const IS_BROWSER = !!import.meta.env?.VITEST_BROWSER; // true only in @vitest/browser

/* ------------ CI (or when USE_FAKE_WEBGL=1): no GPU, no network ------------ */
if (USE_FAKE) {
  // Fake THREE.WebGLRenderer (must define inside factory because vi.mock is hoisted)
  vi.mock('three', async (orig) => {
    const actual = await orig();
    class FakeRenderer {
      constructor() {
        this.domElement = Object.assign(document.createElement('canvas'), { width: 800, height: 600 });
        this.isWebGLRenderer = true; // keep your tests happy
      }
      setSize() {}
      setPixelRatio() {}
      render() {}
      dispose() {}
    }
    return { ...actual, WebGLRenderer: FakeRenderer };
  });

  // Mock Supabase (no network)
  vi.mock('/src/supabaseClient.js', () => {
    const supabase = {
      from: () => ({
        select: async () => ({
          data: [
            {
              file_name:
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
              people: {},
            },
            {
              file_name:
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
              people: {},
            },
          ],
          error: null,
        }),
      }),
    };
    return { supabase };
  });

  // Mock GLB loader (no fetches)
  vi.mock('/src/glbLoader.js', () => ({
    loadGLBFromURL: async (_url, scene, _camera, onLoad) => {
      const THREE = await import('three');
      scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
      onLoad && onLoad();
    },
  }));
}

/* ---- Local default: real WebGL if you run with @vitest/browser; otherwise headless-gl ---- */
if (!USE_FAKE && !IS_BROWSER) {
  // Node + jsdom: give Three a real-ish WebGL context via headless-gl
  const { default: createGL } = await import('gl');

  if (!window.innerWidth) {
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 720, writable: true });
  }
  if (!window.devicePixelRatio) {
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true });
  }

  const getContextPatched = function (type) {
    if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
      return createGL(1, 1, { preserveDrawingBuffer: true });
    }
    if (type === '2d') {
      return {
        canvas: this,
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        putImageData() {},
        drawImage() {},
        fillRect() {},
        clearRect() {},
      };
    }
    return null;
  };

  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: getContextPatched, writable: true });
  if (typeof OffscreenCanvas !== 'undefined') {
    Object.defineProperty(OffscreenCanvas.prototype, 'getContext', { value: getContextPatched, writable: true });
  }
}

/* Quiet noisy logs */
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation((...args) => console.log('[test error]', ...args));
