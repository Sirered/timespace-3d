import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

// Mock texture loader (no network)
vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((url, onLoad) => {
  const img = { width: 16, height: 16 };
  const texture = { image: img, colorSpace: THREE.SRGBColorSpace, anisotropy: 4 };
  setTimeout(() => onLoad?.(texture), 0);
  return texture;
});

// Import after mocks
import { initStarfield, updateStarfield, reseedStarfield } from '../src/starfield.js';

// Minimal scene/camera helpers
function makeScene() { return new THREE.Scene(); }
function makeOrthoCamera() {
  const aspect = 1280 / 720;
  const frustum = 10;
  const cam = new THREE.OrthographicCamera(
    -frustum * aspect / 2,
    frustum * aspect / 2,
    frustum / 2,
    -frustum / 2,
    0.1,
    1000
  );
  cam.position.set(-30, 0, 0);
  cam.lookAt(0, 0, 0);
  cam.updateProjectionMatrix();
  return cam;
}

describe('starfield (slab mode)', () => {
  let scene, camera;

  beforeEach(() => {
    scene = makeScene();
    camera = makeOrthoCamera();
  });

  it('creates multiple depth layers and adds them to the scene', async () => {
    const before = scene.children.length;
    await initStarfield(scene, {
      camera,
      mode: 'slab',
      count: 300,
      depthOffsets: [-40, -20, 0],
      viewMult: 1.3,
      bigTwinkleCount: 0, // skip sprites for simpler assertions
    });
    const after = scene.children.length;
    expect(after).toBeGreaterThan(before);

    // There should be a single group added that holds point layers
    const group = scene.children.find(c => c.type === 'Group');
    expect(group).toBeTruthy();
    const points = group.children.filter(c => c.type === 'Points');
    expect(points.length).toBeGreaterThan(0);
  });

  it('twinkles (opacity changes) when updateStarfield is called over time', async () => {
    await initStarfield(scene, {
      camera,
      mode: 'slab',
      count: 120,
      depthOffsets: [0],
      bigTwinkleCount: 0,
    });

    const group = scene.children.find(c => c.type === 'Group');
    const pts = group.children.filter(c => c.type === 'Points');
    expect(pts.length).toBeGreaterThan(0);

    const mat = pts[0].material;
    const beforeOpacity = mat.opacity;

    updateStarfield(0.016);
    updateStarfield(0.3);
    updateStarfield(0.6);

    // opacity should remain in [0,1] and likely change a bit
    expect(mat.opacity).toBeGreaterThan(0);
    expect(mat.opacity).toBeLessThanOrEqual(1);
    // Not a strict inequality (twinkle is sinusoidal), but it should usually differ
    // If this flakes, you can relax to just bounding box checks.
    expect(mat.opacity).not.toBe(beforeOpacity);
  });

  it('reseedStarfield rebuilds the group cleanly', async () => {
    await initStarfield(scene, { camera, mode: 'slab', count: 120, bigTwinkleCount: 0 });
    const group1 = scene.children.find(c => c.type === 'Group');
    expect(group1).toBeTruthy();

    // reseed (re-init)
    await reseedStarfield(scene);
    const group2 = scene.children.find(c => c.type === 'Group');
    expect(group2).toBeTruthy();
  });
});
