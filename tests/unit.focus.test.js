import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';

// Hoisted shared state for the mock
const h = vi.hoisted(() => ({
  images: [], // will be used as orbitImages
}));

// Provide orbitImages to the module under test
vi.mock('../src/imageLoader.js', () => ({
  orbitImages: h.images,
}));

// Now import the module(s) that consume orbitImages
import { setupFocusInteraction, updateFocus, isFocusMode, clearFocus } from '../src/focusInteraction.js';

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
function clickCanvas(canvas, camera, world) {
  const r = canvas.getBoundingClientRect();
  const v = world.clone().project(camera);
  const x = (v.x * 0.5 + 0.5) * r.width;
  const y = (-v.y * 0.5 + 0.5) * r.height;
  canvas.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
}

describe('focusInteraction — unit', () => {
  let scene, camera, canvas, renderer;
  let A, B, C;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    camera.position.set(-30, 0, 0);
    camera.lookAt(0, 0, 0);

    canvas = prepCanvas();
    renderer = { domElement: canvas };

    // reset shared array
    h.images.length = 0;

    // Set up three sprites (A focusable, B related, C unrelated)
    A = makeSprite(); A.position.set(0, 0, 0);
    B = makeSprite(); B.position.set(2, 1, 0);
    C = makeSprite(); C.position.set(-2, -1, 0);
    scene.add(A, B, C);

    h.images.push(
      { mesh: A, record: { people: ['alice'] } },
      { mesh: B, record: { people: ['alice', 'bob'] } }, // related
      { mesh: C, record: { people: ['carol'] } },        // unrelated
    );

    setupFocusInteraction({ scene, camera, renderer });
  });

  it('enters focus mode and applies tiers & depth flags', () => {
    expect(isFocusMode()).toBe(false);
    clickCanvas(canvas, camera, A.position);
    expect(isFocusMode()).toBe(true);

    // focusInteraction constants: BG=5, RING=50, FOCUS=100
    expect(A.renderOrder).toBe(100);
    expect(B.renderOrder).toBe(50);
    expect(C.renderOrder).toBe(5);

    [A, B, C].forEach(m => {
      expect(m.material.depthWrite).toBe(false);
      expect(m.material.depthTest).toBe(false);
    });
  });

  it('clearFocus restores background tier', () => {
    clickCanvas(canvas, camera, A.position);
    clearFocus();

    expect(isFocusMode()).toBe(false);
    expect(A.renderOrder).toBe(5);
    expect(B.renderOrder).toBe(5);
    expect(C.renderOrder).toBe(5);
  });

  it('updateFocus animates ring placement over time', () => {
    clickCanvas(canvas, camera, A.position);

    const before = B.position.clone();
    updateFocus(10_000);
    updateFocus(11_000); // +1s
    const after = B.position.clone();

    expect(after.distanceTo(before)).toBeGreaterThan(0.001);
  });
});
