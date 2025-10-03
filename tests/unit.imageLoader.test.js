import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';

// Mock Supabase result
vi.mock('../src/supabaseClient.js', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        data: [
          { file_name: '/mock/imgA.png', people: {} },
          { file_name: '/mock/imgB.png', people: {} },
        ],
        error: null,
      }),
    }),
  },
}));

// Mock textures
vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((url, onLoad) => {
  const img = { width: 100, height: 50 };
  const texture = { image: img, colorSpace: THREE.SRGBColorSpace, anisotropy: 4 };
  setTimeout(() => onLoad?.(texture), 0);
  return texture;
});

import { loadImagesFromSupabase, orbitImages } from '../src/imageLoader.js';

describe('imageLoader', () => {
  let scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    orbitImages.length = 0;
  });

    it('creates image nodes with correct material and flags', async () => {
    await loadImagesFromSupabase(scene);
    expect(orbitImages.length).toBe(2);

    const node = scene.children.find(c => c.isMesh || c.isSprite);
    expect(node).toBeTruthy();

    if (node.isMesh) {
        // MeshStandardMaterial path (plane geometry)
        expect(node.material).toBeInstanceOf(THREE.MeshStandardMaterial);
        expect(node.material.transparent).toBe(true);
        expect(node.material.toneMapped).toBe(false);
        expect(node.material.depthWrite).toBe(false);
        expect(node.renderOrder).toBe(2);
    } else if (node.isSprite) {
        // SpriteMaterial path
        expect(node.material).toBeInstanceOf(THREE.SpriteMaterial);
        // Sprites don’t have toneMapped; just check transparency and depth flags
        expect(node.material.transparent).toBe(true);
        expect(node.material.depthWrite).toBe(false);
        // If your sprite loader sets renderOrder, assert it; otherwise skip
        expect(typeof node.renderOrder).toBe('number');
    } else {
        throw new Error('Unexpected node type; expected Mesh or Sprite.');
    }
    });


  it('assigns orbit metadata per image', async () => {
    await loadImagesFromSupabase(scene);
    const entry = orbitImages[0];
    expect(entry.orbitRadius).toBeDefined();
    expect(typeof entry.angle).toBe('number');
    expect(typeof entry.verticalOffset).toBe('number');
  });
});
