// tests/setupCamera.unit.test.js
import * as THREE from 'three';
import { describe, it, expect } from 'vitest';
import { setupCamera } from '../src/setupCamera.js';

describe('setupCamera()', () => {
  it('returns an OrthographicCamera with expected frustum and lookAt', () => {
    const cam = setupCamera();
    expect(cam.isOrthographicCamera).toBe(true);
    expect(cam.near).toBeCloseTo(0.1);
    expect(cam.far).toBeGreaterThan(100);

    const dir = cam.getWorldDirection(new THREE.Vector3());
    expect(Math.sign(dir.x)).toBe(1);
  });
});
