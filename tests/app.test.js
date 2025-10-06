// tests/app.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

// --- Mocks MUST come before importing modules that depend on them ---
// ✅ Mock window.Image early
global.Image = class MockImage {
  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
  set src(v) { this._src = v; }
  get src() { return this._src; }
  get width() { return 100; }
  get height() { return 50; }
  get naturalWidth() { return 100; }
  get naturalHeight() { return 50; }
};

// Mock Supabase client used by image loader
vi.mock('../src/supabaseClient.js', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        data: [
          { file_name: '/mock/image1.png', people: {} },
          { file_name: '/mock/image2.png', people: {} },
        ],
        error: null,
      }),
    }),
  },
}));

// Mock GLB loader so we don't fetch real files
vi.mock('../src/glbLoader.js', () => ({
  loadGLBFromURL: (url, scene, camera, cb = () => {}) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial()
    );
    scene.add(mesh);
    cb(mesh);
    return Promise.resolve(mesh);
  },
}));

// Mock TextureLoader network fetches (applies to anything creating a TextureLoader)
vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((url, onLoad) => {
  // Minimal texture-like object for tests
  const img = { width: 100, height: 100 };
  const texture = { image: img, colorSpace: THREE.SRGBColorSpace, anisotropy: 4 };
  // Call onLoad asynchronously like real loader
  setTimeout(() => onLoad?.(texture), 0);
  return texture;
});

// --- Now import your modules under test ---
import { setupScene } from '../src/setupScene.js';
import { setupCamera } from '../src/setupCamera.js';
import { setupRenderer } from '../src/setupRenderer.js';
import { initStarfield } from '../src/starfield.js';
import { loadGLBFromURL } from '../src/glbLoader.js';
import { loadImagesFromSupabase, orbitImages } from '../src/imageLoader.js';

describe('Three.js App Setup', () => {
  let scene, camera, renderer;

  beforeEach(() => {
    scene = setupScene();
    camera = setupCamera();
    renderer = setupRenderer();
  });

  it('creates a scene, camera, and renderer', () => {
    expect(scene.isScene).toBe(true);
    expect(camera.isCamera).toBe(true);
    expect(renderer.isWebGLRenderer).toBe(true);
  });

  it('initializes starfield without errors', async () => {
    await initStarfield(scene, { camera, count: 100 });
    expect(scene.children.length).toBeGreaterThan(0);
  });

  it('loads GLB model into the scene', async () => {
    const before = scene.children.length;
    await loadGLBFromURL('/mock.glb', scene, camera, () => {});
    expect(scene.children.length).toBeGreaterThan(before);
  });

  it('loads images from Supabase and adds to orbitImages', async () => {
    await loadImagesFromSupabase(scene);
    expect(orbitImages.length).toBe(2);
    expect(scene.children.some((c) => c.isMesh || c.isSprite)).toBe(true);
  });
});
