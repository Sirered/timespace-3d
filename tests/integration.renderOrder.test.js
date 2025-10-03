// tests/integration.renderOrder.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

// Mocks before imports
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
      new THREE.MeshBasicMaterial()
    );
    glbMesh.renderOrder = 0; // typical
    scene.add(glbMesh);
    cb(glbMesh);
    return Promise.resolve(glbMesh);
  },
}));

// Imports
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

    const photos = scene.children.filter(c => c.isSprite);
    expect(photos.length).toBeGreaterThan(0);

    // All photos should render in front (your loader sets renderOrder = 2)
    const allFront = photos.every(p => (p.renderOrder ?? 0) >= (glb.renderOrder ?? 0));
    expect(allFront).toBe(true);

    // Transparent images shouldn't write to depth (avoid holes)
    const noDepthWrites = photos.every(p => p.material && p.material.depthWrite === false);
    expect(noDepthWrites).toBe(true);
  });
});
