import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

// Patch TextureLoader so initStarfield resolves immediately
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

// Helper to collect all Points in scene (recursively)
function findPointsRecursive(node) {
  let results = [];
  if (node.isPoints) results.push(node);
  if (node.children) {
    for (const child of node.children) {
      results = results.concat(findPointsRecursive(child));
    }
  }
  return results;
}

describe('starfield functional – responds to camera basis changes', () => {
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
  }, 30000);

  it('recomputes point positions when camera orientation changes', async () => {
    const pointNodes = findPointsRecursive(scene);
    expect(pointNodes.length).toBeGreaterThan(0);

    const snapshot = (nodes) =>
      nodes.map((p) => {
        const a = p.geometry.attributes.position.array;
        return [a[0], a[1], a[2]];
      });

    const before = snapshot(pointNodes);

    camera.rotation.y += 0.2;
    camera.updateMatrixWorld(true);

    updateStarfield(0.016);

    const after = snapshot(pointNodes);

    const moved = before.some((b, i) => {
      const a = after[i];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      return d > 1e-4;
    });

    expect(moved).toBe(true);
  }, 30000);
});
