// tests/integration.starfield.cameraSync.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

// Mock star sprite texture
vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((url, onLoad) => {
  const texture = {
    image: { width: 16, height: 16 },
    colorSpace: THREE.SRGBColorSpace,
    anisotropy: 1,
  };
  onLoad?.(texture); // synchronous
  return texture;
});

import { initStarfield, updateStarfield } from '../src/starfield.js';

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

describe('Integration – starfield responds to camera orientation', () => {
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

    await Promise.resolve();
  }, 30000);

  it('points move after camera yaw changes and updateStarfield runs', async () => {
    const points = [];
    scene.traverse((o) => { if (o.isPoints) points.push(o); });
    expect(points.length).toBeGreaterThan(0);

    // snapshot a small subset of vertices across layers
    const snapshot = () => points.map(p => {
      const arr = p.geometry.attributes.position.array;
      // capture the first xyz triple
      return [arr[0], arr[1], arr[2]];
    });

    const before = snapshot();

    // rotate camera slightly (yaw) and update
    camera.rotation.y += 0.2;
    camera.updateMatrixWorld(true);
    updateStarfield(0.016);

    await Promise.resolve();

    const after = snapshot();

    // any moved?
    const moved = before.some((b, i) => {
      const a = after[i];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      return d > 1e-5; // tolerant threshold
    });

    expect(moved).toBe(true);
  }, 30000);
});
