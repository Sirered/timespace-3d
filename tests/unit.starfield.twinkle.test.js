import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

// Mock TextureLoader so initStarfield resolves immediately
vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((url, onLoad) => {
  const tex = {
    image: { width: 16, height: 16 },
    colorSpace: THREE.SRGBColorSpace,
    anisotropy: 1,
  };
  onLoad?.(tex);
  return tex;
});

import { initStarfield, updateStarfield } from '../src/starfield.js';

// Helper: collect all THREE.Points alive in the scene (recursive)
function findPointsRecursive(node) {
  let out = [];
  if (node.isPoints) out.push(node);
  for (const c of node.children || []) out = out.concat(findPointsRecursive(c));
  return out;
}

describe('starfield twinkling – points opacity responds to time', () => {
  let scene, camera;

  beforeEach(async () => {
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    camera.position.set(-30, 0, 0);
    camera.lookAt(0, 0, 0);

    await initStarfield(scene, {
      camera,
      mode: 'slab',
      count: 300,
      viewMult: 1.2,
      depthOffsets: [-40, -20, 0],
      sizeMult: 1.0,
      brightness: 1.0,
      textureURL: '/mock/sprite.png',
    });
  }, 20000);

  it('material opacity changes over consecutive updates (twinkle)', () => {
    const points = findPointsRecursive(scene);
    expect(points.length).toBeGreaterThan(0);

    // capture opacities at t0
    const before = points.map(p => p.material.opacity);

    // advance time in a few steps
    updateStarfield(0.033); // ~1 frame @30 FPS
    updateStarfield(0.033);
    updateStarfield(0.033);

    const after = points.map(p => p.material.opacity);

    // At least one layer should have a different opacity due to twinkle
    const anyChanged = before.some((b, i) => Math.abs(after[i] - b) > 1e-5);
    expect(anyChanged).toBe(true);
  });
});
