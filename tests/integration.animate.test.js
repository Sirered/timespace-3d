// tests/integration.animate.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

// Mocks before imports:
vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((url, onLoad) => {
  const texture = {
    image: { width: 16, height: 16 },
    colorSpace: THREE.SRGBColorSpace,
    anisotropy: 1,
  };
  setTimeout(() => onLoad?.(texture), 0);
  return texture;
});

// Import modules
import { setupScene } from '../src/setupScene.js';
import { setupCamera } from '../src/setupCamera.js';
import { animate } from '../src/animate.js';

describe('Integration – animate with composer-like object', () => {
  let scene, camera;

  beforeEach(() => {
    scene = setupScene();
    camera = setupCamera();
  });

  it('calls updateFn and composer.render()', async () => {
    // Fake composer (no isWebGLRenderer)
    const composer = {
      _renders: 0,
      render() { this._renders++; },
    };

    const updateFn = vi.fn();

    // Run animate for a couple frames then stop
    const rafIds = [];
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      // Trigger a few frames quickly
      const id = setTimeout(() => cb(performance.now()), 5);
      rafIds.push(id);
      return id;
    });

    animate(scene, camera, composer, updateFn, /*controls*/ null);

    await new Promise((r) => setTimeout(r, 30));

    rafIds.forEach(clearTimeout);
    expect(updateFn).toHaveBeenCalled();
    expect(composer._renders).toBeGreaterThan(0);
  });
});
