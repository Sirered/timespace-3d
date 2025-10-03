// tests/integration.scene.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

// --- Mocks (must be defined before module imports that use them) ---

// 1) Supabase mock (image list)
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

// 2) TextureLoader mock (so no network)
vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((url, onLoad) => {
   const texture = {
     image: { width: 100, height: 80 },
     colorSpace: THREE.SRGBColorSpace,
     anisotropy: 4,
   };
   onLoad?.(texture); // synchronous
   return texture;
});

// 3) GLB loader mock (adds a box mesh)
vi.mock('../src/glbLoader.js', () => ({
  loadGLBFromURL: (url, scene, camera, cb = () => {}) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial()
    );
    mesh.renderOrder = 0; // typical for your GLB
    scene.add(mesh);
    cb(mesh);
    return Promise.resolve(mesh);
  },
}));

// --- Import modules under test ---
import { setupScene } from '../src/setupScene.js';
import { setupCamera } from '../src/setupCamera.js';
import { setupRenderer } from '../src/setupRenderer.js';
import { setupLights } from '../src/setupLights.js';
import { initStarfield } from '../src/starfield.js';
import { loadGLBFromURL } from '../src/glbLoader.js';
import { loadImagesFromSupabase } from '../src/imageLoader.js';

function findAnyDeep(root, predicate) {
  let found = null;
  root.traverse?.((o) => { if (!found && predicate(o)) found = o; });
  return found;
}
function someDeep(root, predicate) {
  let ok = false;
  root.traverse?.((o) => { if (predicate(o)) ok = true; });
  return ok;
}

describe('Integration – full scene assembly', () => {
  let scene, camera, renderer;

  beforeEach(() => {
    scene = setupScene();
    camera = setupCamera();
    renderer = setupRenderer();
    setupLights(scene);
  });

  it('assembles scene with lights, starfield, GLB, and images', async () => {
    await initStarfield(scene, { camera, count: 200, mode: 'slab' });
    await loadGLBFromURL('/mock.glb', scene, camera, () => {});
    await loadImagesFromSupabase(scene);

    // existence checks
    const hasLight   = scene.children.some(c => c.isLight);
    const hasPoints  = someDeep(scene, (o) => o.isPoints === true);
    const hasMesh    = scene.children.some(c => c.isMesh);
    const hasSprite  = scene.children.some(c => c.isSprite);

    expect(hasLight).toBe(true);
    expect(hasPoints).toBe(true);
    expect(hasMesh || hasSprite).toBe(true);
  });
});
