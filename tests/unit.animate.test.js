import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { animate } from '../src/animate.js';

function makeSceneCamera() {
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
  cam.position.set(5, 5, 5);
  cam.lookAt(0, 0, 0);
  return { scene, cam };
}

describe('animate()', () => {
  it('renders with WebGLRenderer and calls updateFn', async () => {
    const { scene, cam } = makeSceneCamera();

    // Fake renderer
    const renderer = {
      isWebGLRenderer: true,
      render: vi.fn(),
    };

    const updateFn = vi.fn();

    const stop = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      // single tick
      setTimeout(() => cb(performance.now()), 0);
      return 1;
    });

    animate(scene, cam, renderer, updateFn, null);
    await new Promise(r => setTimeout(r, 10));

    expect(renderer.render).toHaveBeenCalledWith(scene, cam);
    expect(updateFn).toHaveBeenCalled();

    stop.mockRestore();
  });

  it('renders with EffectComposer (no isWebGLRenderer) and calls updateFn', async () => {
    const { scene, cam } = makeSceneCamera();

    const composer = { render: vi.fn() }; // no isWebGLRenderer → treated as composer
    const updateFn = vi.fn();

    const stop = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      setTimeout(() => cb(performance.now()), 0);
      return 1;
    });

    animate(scene, cam, composer, updateFn, null);
    await new Promise(r => setTimeout(r, 10));

    expect(composer.render).toHaveBeenCalled();
    expect(updateFn).toHaveBeenCalled();

    stop.mockRestore();
  });
});
