// tests/unit.logoPath.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';

import {
  hasLogoPath,
  getPathsCount,
  getPointOnLogoPath,
  setLogoFixedPathsFromModel,
} from '/src/logoPath.js';

/**
 * Build a "ring" Mesh: vertices on a circle in the XZ plane with fixed Y.
 * Only the `position` attribute is used (no indices/faces needed).
 * This is sufficient for logoPath's extraction & smoothing logic.
 */
function makeRingMesh({ y = 0, radius = 1, segments = 64 }) {
  const positions = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const x = Math.cos(t) * radius;
    const z = Math.sin(t) * radius;
    positions.push(x, y, z);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const mat = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.y = 0; // vertices already include Y; world matrix remains aligned
  mesh.updateMatrixWorld(true);
  return mesh;
}

/**
 * Build a model containing five vertically stacked rings.
 * From top to bottom, their center Y are: 2, 1, 0, -1, -2.
 * Radii are slightly different to avoid degenerate curves.
 */
function makeModelWithFiveRings() {
  const ys = [2, 1, 0, -1, -2];
  const group = new THREE.Group();
  ys.forEach((y, i) => {
    const ring = makeRingMesh({ y, radius: 1 + i * 0.2, segments: 96 });
    group.add(ring);
  });
  group.updateMatrixWorld(true);
  return group;
}

describe('logoPath: setLogoFixedPathsFromModel + sampling', () => {
  beforeEach(() => {
    // No explicit reset needed: logoPath keeps internal state and
    // setLogoFixedPathsFromModel() overwrites previously built paths.
  });

  it('should report empty state before building', () => {
    expect(getPathsCount()).toBe(0);
    expect(hasLogoPath(0)).toBe(false);
    expect(getPointOnLogoPath(0)).toBeNull();
  });

  it('builds exactly two closed orbits from the 3rd and 5th meshes', () => {
    const model = makeModelWithFiveRings();
    setLogoFixedPathsFromModel(model);

    // Two orbits must be available
    expect(getPathsCount()).toBe(2);
    expect(hasLogoPath(0)).toBe(true);
    expect(hasLogoPath(1)).toBe(true);
    expect(hasLogoPath(2)).toBe(false);

    // Both orbits are closed: t=0 and t=1 should coincide
    const p0a = getPointOnLogoPath(0, { pathIndex: 0 });
    const p1a = getPointOnLogoPath(1, { pathIndex: 0 });
    const p0b = getPointOnLogoPath(0, { pathIndex: 1 });
    const p1b = getPointOnLogoPath(1, { pathIndex: 1 });

    const eps = 1e-3;
    expect(p0a.distanceTo(p1a)).toBeLessThan(eps);
    expect(p0b.distanceTo(p1b)).toBeLessThan(eps);

    // Verify orbit selection by vertical order
    const sampleU = 0.123;
    const a = getPointOnLogoPath(sampleU, { pathIndex: 0 });
    const b = getPointOnLogoPath(sampleU, { pathIndex: 1 });
    expect(Math.abs(a.y - 0)).toBeLessThan(1e-3);
    expect(Math.abs(b.y - (-2))).toBeLessThan(1e-3);
  });

  it('applies xOffset when sampling', () => {
    const model = makeModelWithFiveRings();
    setLogoFixedPathsFromModel(model);

    const t = 0.42;
    const base = getPointOnLogoPath(t, { pathIndex: 0, xOffset: 0 });
    const shifted = getPointOnLogoPath(t, { pathIndex: 0, xOffset: 0.5 });

    expect(shifted.x - base.x).toBeCloseTo(0.5, 1e-6);
    expect(shifted.y).toBeCloseTo(base.y, 1e-6);
    expect(shifted.z).toBeCloseTo(base.z, 1e-6);
  });
});
