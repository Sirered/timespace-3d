import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';

// Hoisted shared state for mocks (no TS casts!)
const hoisted = vi.hoisted(() => ({
  images: [],
  isFocus: false,
}));

// Mock the EXACT specifiers used inside your animate.js
vi.mock('/src/imageLoader.js', () => ({
  orbitImages: hoisted.images,           // export the same array reference
}));

vi.mock('/src/focusInteraction.js', () => ({
  isFocusMode: () => hoisted.isFocus,    // toggled by the test
  updateFocus: () => {},                 // no-op
}));

vi.mock('/src/logoPath.js', () => ({
  hasLogoPath: () => false,              // force simple orbit branch
  getPointOnLogoPath: () => new THREE.Vector3(),
}));

// Import after mocks are declared
import { animate } from '../src/animate.js';

describe('animate() functional', () => {
  let scene, camera, renderer;

  beforeEach(() => {
    // fresh scene/camera each test
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    camera.position.set(-30, 0, 0);
    camera.lookAt(0, 0, 0);

    // basic WebGLRenderer (jsdom canvas context is stubbed in tests/setup.js)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(64, 64);

    // reset orbit images and focus flag
    hoisted.images.length = 0;
    hoisted.isFocus = false;

    // seed a couple of sprites that animate will move
    const tex = new THREE.Texture(); // dummy, not used for layout
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const s1 = new THREE.Sprite(mat);
    const s2 = new THREE.Sprite(mat);

    scene.add(s1, s2);

    hoisted.images.push(
      { mesh: s1, angle: 0.0, orbitRadius: 5, verticalOffset: 0 },
      { mesh: s2, angle: Math.PI * 0.25, orbitRadius: 6, verticalOffset: 0.5 },
    );

    vi.useFakeTimers();  // control RAF
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('orbits images over time when not in focus mode', () => {
    // At t0, sprites are at origin (default); after a few frames they should move
    const p0a = hoisted.images[0].mesh.position.clone();
    const p0b = hoisted.images[1].mesh.position.clone();

    // start the loop
    animate(scene, camera, renderer, () => {}, null);

    // advance a few animation frames
    // (jsdom schedules requestAnimationFrame with setTimeout(…, 16))
    vi.advanceTimersByTime(100); // ~6 frames

    const p1a = hoisted.images[0].mesh.position.clone();
    const p1b = hoisted.images[1].mesh.position.clone();

    // positions should have changed from origin
    expect(p1a.length()).toBeGreaterThan(0.01);
    expect(p1b.length()).toBeGreaterThan(0.01);

    // and should differ from their original values
    expect(p1a.distanceTo(p0a)).toBeGreaterThan(0.01);
    expect(p1b.distanceTo(p0b)).toBeGreaterThan(0.01);
  });

  it('freezes orbit while in focus mode and resumes after', () => {
    // start the loop (not focused)
    animate(scene, camera, renderer, () => {}, null);

    // let it move for a bit
    vi.advanceTimersByTime(80);
    const movedPos = hoisted.images[0].mesh.position.clone();

    // enter focus mode → movement should freeze
    hoisted.isFocus = true;
    const freezeCheckStart = hoisted.images[0].mesh.position.clone();
    vi.advanceTimersByTime(200);
    const freezeCheckEnd = hoisted.images[0].mesh.position.clone();

    // confirm essentially no movement while focused
    expect(freezeCheckEnd.distanceTo(freezeCheckStart)).toBeLessThan(1e-3);

    // leave focus mode → resume
    hoisted.isFocus = false;
    vi.advanceTimersByTime(80);
    const resumedPos = hoisted.images[0].mesh.position.clone();

    // now it should have moved again from the frozen location
    expect(resumedPos.distanceTo(freezeCheckEnd)).toBeGreaterThan(0.01);
    // and shouldn’t snap back to the initial moved position
    expect(resumedPos.distanceTo(movedPos)).toBeGreaterThan(0.01);
  });
});
