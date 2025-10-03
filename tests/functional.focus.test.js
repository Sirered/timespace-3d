import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';

// Hoisted shared state for the mock
const h = vi.hoisted(() => ({
  images: [],
}));

vi.mock('../src/imageLoader.js', () => ({
  orbitImages: h.images,
}));

import { setupFocusInteraction, updateFocus, isFocusMode } from '../src/focusInteraction.js';

function makeSprite() {
  const mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: true, depthTest: true });
  const s = new THREE.Sprite(mat);
  s.scale.set(1.8, 1.8, 1);
  return s;
}
function prepCanvas(w = 900, h = 600) {
  const c = document.createElement('canvas');
  c.getBoundingClientRect = () => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h });
  Object.defineProperty(c, 'width',  { value: w, writable: true });
  Object.defineProperty(c, 'height', { value: h, writable: true });
  return c;
}
function toClient(canvas, camera, world) {
  const r = canvas.getBoundingClientRect();
  const v = world.clone().project(camera);
  return { x: (v.x * 0.5 + 0.5) * r.width, y: (-v.y * 0.5 + 0.5) * r.height };
}
function clickAt(canvas, x, y) {
  canvas.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
}
function moveAt(canvas, x, y) {
  canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
}

describe('focusInteraction — functional', () => {
  let scene, camera, canvas, renderer;
  let A, B, C, D;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    camera.position.set(-30, 0, 0);
    camera.lookAt(0, 0, 0);

    canvas = prepCanvas();
    renderer = { domElement: canvas };

    h.images.length = 0;

    A = makeSprite(); A.position.set(0, 0, 0);
    B = makeSprite(); B.position.set(2, 1, 0);
    C = makeSprite(); C.position.set(-2, -1, 0);
    D = makeSprite(); D.position.set(0, 2.5, 0);
    scene.add(A, B, C, D);

    h.images.push(
      { mesh: A, record: { people: ['x'] } },
      { mesh: B, record: { people: ['x', 'y'] } }, // related
      { mesh: C, record: { people: ['z'] } },      // unrelated
      { mesh: D, record: { people: ['x'] } },      // related (ring)
    );

    setupFocusInteraction({ scene, camera, renderer });
  });

  it('focus → tiers are 100/50/5 and background is dimmed', () => {
    const p = toClient(canvas, camera, A.position);
    clickAt(canvas, p.x, p.y);

    expect(isFocusMode()).toBe(true);
    expect(A.renderOrder).toBe(100);
    expect(B.renderOrder).toBe(50);
    expect(D.renderOrder).toBe(50);
    expect(C.renderOrder).toBe(5);
    expect(C.material.opacity).toBeLessThan(1);
  });
});
