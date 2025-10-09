// tests/integration.renderOrder.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

// ✅ Mock window.Image early (imageLoader awaits onload)
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

// --- Mocks before imports ---
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

// If anything calls TextureLoader, keep it harmless
vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((url, onLoad) => {
  const texture = {
    image: { width: 120, height: 100 },
    colorSpace: THREE.SRGBColorSpace,
    anisotropy: 2,
  };
  setTimeout(() => onLoad?.(texture), 0);
  return texture;
});

vi.mock('../src/glbLoader.js', () => ({
  loadGLBFromURL: (url, scene, camera, cb = () => {}) => {
    const glbMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial() // depthWrite: true by default
    );
    glbMesh.renderOrder = 0;
    scene.add(glbMesh);
    cb(glbMesh);
    return Promise.resolve(glbMesh);
  },
}));

// --- Imports under test ---
import { setupScene } from '../src/setupScene.js';
import { setupCamera } from '../src/setupCamera.js';
import { loadGLBFromURL } from '../src/glbLoader.js';
import { loadImagesFromSupabase } from '../src/imageLoader.js';

describe('Integration – render order & transparency contracts', () => {
  let scene, camera;

  beforeEach(() => {
    scene = setupScene();
    camera = setupCamera();
  });

  it('ensures images render in front and do not write depth', async () => {
    await loadGLBFromURL('/mock.glb', scene, camera, () => {});
    await loadImagesFromSupabase(scene);

    const glb = scene.children.find(c => c.isMesh && c.geometry?.type === 'BoxGeometry');
    expect(glb).toBeTruthy();

    // 🔑 Only select images created by imageLoader:
    // they are sprites with userData.basePx set in your loader.
    const photos = scene.children.filter(
      c => (c.isMesh || c.isSprite) && c.visible && c.userData?.basePx != null
    );

    expect(photos.length).toBeGreaterThan(0);

    // Images should render in front of the GLB
    const allFront = photos.every(p => (p.renderOrder ?? 0) >= (glb.renderOrder ?? 0));
    expect(allFront).toBe(true);

    // Transparent image materials shouldn’t write depth
    const noDepthWrites = photos.every(p => p.material && p.material.depthWrite === false);
    expect(noDepthWrites).toBe(true);

    // And depthTest is disabled per your loader
    const noDepthTest = photos.every(p => p.material && p.material.depthTest === false);
    expect(noDepthTest).toBe(true);
  });
});
