import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { flushPromises } from './helpers/testUtils.js';

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

import { loadImagesFromSupabase, orbitImages } from '../src/imageLoader.js';

describe('imageLoader', () => {
  let scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    orbitImages.length = 0;
  });

  it('creates image nodes with correct material and flags', async () => {
    await loadImagesFromSupabase(scene);
    await flushPromises();

    expect(orbitImages.length).toBe(2);
    const node = scene.children.find(c => c.isSprite);
    expect(node).toBeTruthy();
    expect(node.material).toBeInstanceOf(THREE.SpriteMaterial);
    expect(node.material.transparent).toBe(true);
    expect(node.material.depthWrite).toBe(false);
  }, 10_000);

  it('assigns orbit metadata per image', async () => {
    await loadImagesFromSupabase(scene);
    await flushPromises();

    const entry = orbitImages[0];
    expect(entry.orbitRadius).toBeDefined();
    expect(typeof entry.angle).toBe('number');
    expect(typeof entry.verticalOffset).toBe('number');
  }, 10_000);
});
