import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { setupLights } from '../src/setupLights.js';

describe('setupLights()', () => {
  it('adds ambient, directional, and hemisphere lights with expected intensities', () => {
    const scene = new THREE.Scene();
    setupLights(scene);

    const amb = scene.children.find(o => o.isLight && o.type === 'AmbientLight');
    const dirs = scene.children.filter(o => o.isLight && o.type === 'DirectionalLight');
    const hemi = scene.children.find(o => o.isLight && o.type === 'HemisphereLight');

    expect(amb).toBeTruthy();
    expect(amb.intensity).toBeCloseTo(0.15);

    expect(dirs.length).toBeGreaterThanOrEqual(2);
    expect(dirs[0].intensity).toBeGreaterThan(0.9); // key
    expect(dirs.some(d => d.intensity < 1)).toBe(true); // fill/rim

    expect(hemi).toBeTruthy();
    expect(hemi.intensity).toBeCloseTo(0.25);
  });
});
