// tests/unit.focus.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';

// Shared mock array backing orbitImages
const h = vi.hoisted(() => ({ images: [] }));

vi.mock('../src/imageLoader.js', () => ({
  orbitImages: h.images,
}));

import {
  setupFocusInteraction,
  updateFocus,
  isFocusMode,
  clearFocus,
} from '../src/focusInteraction.js';

// --- helpers ---
function makeSprite() {
  const mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: true, depthTest: true });
  const s = new THREE.Sprite(mat);
  s.scale.set(1.6, 1.6, 1);
  return s;
}

function prepCanvas(w = 800, h = 600) {
  const c = document.createElement('canvas');
  c.getBoundingClientRect = () => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h });
  Object.defineProperty(c, 'width',  { value: w, writable: true });
  Object.defineProperty(c, 'height', { value: h, writable: true });
  return c;
}

function pointerDownAt(canvas, camera, scene, worldVec) {
  // Ensure world matrices are fresh so raycaster math is correct
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  scene.updateMatrixWorld(true);

  const r = canvas.getBoundingClientRect();
  const v = worldVec.clone().project(camera);
  const x = (v.x * 0.5 + 0.5) * r.width;
  const y = (-v.y * 0.5 + 0.5) * r.height;
  canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: x, clientY: y, bubbles: true }));
}

// --- fake monotonic clock so debounce never blocks across tests ---
let nowMs = 0;
let nowSpy;

describe('focusInteraction — unit', () => {
  let scene, camera, canvas, renderer;
  let A, B, C;

  beforeEach(() => {
    // Jump time forward a lot between tests so any debounce timestamp is safely in the past
    nowMs += 100_000;
    if (!nowSpy) {
      nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
    }

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    camera.position.set(-30, 0, 0);
    camera.lookAt(0, 0, 0);

    canvas = prepCanvas();
    renderer = { domElement: canvas };

    // Reset orbitImages
    h.images.length = 0;

    // Sprites
    A = makeSprite(); A.position.set(0, 0, 0);
    B = makeSprite(); B.position.set(2, 1, 0);
    C = makeSprite(); C.position.set(-2, -1, 0);
    scene.add(A, B, C);

    // Records (A related to B)
    h.images.push(
      { mesh: A, record: { people: ['alice'] } },
      { mesh: B, record: { people: ['alice', 'bob'] } },
      { mesh: C, record: { people: ['carol'] } },
    );

    // Make sure matrices are valid before enabling interaction
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    scene.updateMatrixWorld(true);

    setupFocusInteraction({ scene, camera, renderer });
  });

  afterEach(() => {
    // Nudge time so next test is even farther away
    nowMs += 1_000;
  });

  it('enters focus mode and applies tiers & depth flags', () => {
    pointerDownAt(canvas, camera, scene, A.position);
    expect(isFocusMode()).toBe(true);

    // ORDER_BG = 5, ORDER_RING = 50, ORDER_FOCUS = 100
    expect(A.renderOrder).toBe(100);
    expect(B.renderOrder).toBe(50);
    expect(C.renderOrder).toBe(5);

    [A, B, C].forEach(m => {
      expect(m.material.depthWrite).toBe(false);
      expect(m.material.depthTest).toBe(false);
    });
  });

  it('clearFocus restores background tier', () => {
    pointerDownAt(canvas, camera, scene, A.position);
    clearFocus();

    expect(isFocusMode()).toBe(false);
    expect(A.renderOrder).toBe(5);
    expect(B.renderOrder).toBe(5);
    expect(C.renderOrder).toBe(5);
  });

  it('updateFocus animates ring placement over time', () => {
    // Focus (seeds lastTime inside focusImage with current nowMs)
    pointerDownAt(canvas, camera, scene, A.position);
    expect(isFocusMode()).toBe(true);

    // Capture baseline position for a ring member (B is related to A)
    const before = B.position.clone();

    // Call updateFocus with strictly increasing timestamps.
    // First call at current "now", second call +1000ms.
    const base = performance.now(); // == nowMs
    updateFocus(base);              // establish baseline tick
    nowMs = base + 1000;
    updateFocus(nowMs);             // advance by 1s → ring rotates

    const after = B.position.clone();
    expect(after.distanceTo(before)).toBeGreaterThan(1e-6);
  });
});
