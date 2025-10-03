import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';

// Mock Supabase
vi.mock('../src/supabaseClient.js', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        data: [
          { file_name: '/mock/photoA.png', people: { alice: true } },
          { file_name: '/mock/photoB.png', people: { bob: true, charlie: true } },
        ],
        error: null,
      }),
    }),
  },
}));

// Mock TextureLoader
vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((url, onLoad) => {
  const img = { width: 200, height: 100 }; // landscape
  const texture = { image: img, colorSpace: THREE.SRGBColorSpace, anisotropy: 4 };
  setTimeout(() => onLoad?.(texture), 0);
  return texture;
});

import { loadImagesFromSupabase, orbitImages } from '../src/imageLoader.js';

describe('image loader functional', () => {
  let scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    orbitImages.length = 0;
  });

  it('adds meshes/sprites to the scene and fills orbit metadata', async () => {
    await loadImagesFromSupabase(scene);

    expect(orbitImages.length).toBe(2);

    // Nodes added
    const imgNodes = scene.children.filter((c) => c.isMesh || c.isSprite);
    expect(imgNodes.length).toBeGreaterThanOrEqual(2);

    // Orbit metadata sanity checks
    for (const o of orbitImages) {
      expect(typeof o.angle).toBe('number');
      expect(typeof o.orbitRadius).toBe('number');
      expect(o.mesh).toBeTruthy();
      expect(o.record).toBeTruthy();
      expect(Array.isArray(o.record.people) || typeof o.record.people === 'object').toBe(true);
    }

    const mesh0 = orbitImages[0].mesh;
    expect(mesh0).toBeTruthy();
    // has material + map if Mesh, or map if Sprite
    const mat = mesh0.material ?? mesh0.material?.map;
    if (mesh0.material && 'map' in mesh0.material) {
      expect(mesh0.material.map).toBeTruthy();
    }
    // Only check distance if orbitRadius is set (Meshes path)
    if (typeof orbitImages[0].orbitRadius === 'number') {
      const R = orbitImages[0].orbitRadius;
      const d = mesh0.position.length();
      expect(d).toBeLessThan(R * 2.5);
    }
  });
});
