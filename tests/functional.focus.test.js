// tests/functional.focus.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { setupFocusInteraction, updateFocus, isFocusMode } from '../src/focusInteraction.js';

// orbitImages mock
const h = vi.hoisted(() => ({ images: [] }));
vi.mock('../src/imageLoader.js', () => ({ orbitImages: h.images }));

function makeSprite() {
  const mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: true, depthTest: true });
  const s = new THREE.Sprite(mat);
  s.scale.set(2, 2, 1);
  return s;
}

function prepCanvas(w = 900, h = 600) {
  const c = document.createElement('canvas');
  c.getBoundingClientRect = () => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h });
  Object.defineProperty(c, 'width', { value: w, writable: true });
  Object.defineProperty(c, 'height', { value: h, writable: true });
  return c;
}

function toClient(canvas, camera, world) {
  const r = canvas.getBoundingClientRect();
  const v = world.clone().project(camera);
  return { x: (v.x * 0.5 + 0.5) * r.width, y: (-v.y * 0.5 + 0.5) * r.height };
}

function pointerDownAt(canvas, x, y) {
  // Use window-bound event constructor for jsdom
  const Evt = canvas.ownerDocument.defaultView.PointerEvent ?? canvas.ownerDocument.defaultView.MouseEvent;
  canvas.dispatchEvent(new Evt('pointerdown', { clientX: x, clientY: y, bubbles: true }));
}

describe('focusInteraction — functional', () => {
  let scene, camera, canvas, renderer;
  let A, B, C, D;
  let nowSpy;
  const T0 = 10_000;

  beforeEach(() => {
    nowSpy = vi.spyOn(performance, 'now');
    nowSpy.mockReturnValue(T0);

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

    // A is related to B and D (by shared tag 'x'); C is unrelated
    h.images.push(
      { mesh: A, record: { people: ['x'] } },
      { mesh: B, record: { people: ['x', 'y'] } },
      { mesh: C, record: { people: ['z'] } },
      { mesh: D, record: { people: ['x'] } },
    );

    setupFocusInteraction({ scene, camera, renderer });
  });

  it('focus → applies tiers (100/50/5) and dims background', () => {
    const p = toClient(canvas, camera, A.position);
    nowSpy.mockReturnValue(T0);
    pointerDownAt(canvas, p.x, p.y);

    // tick focus loop once
    updateFocus(T0 + 16);

    expect(isFocusMode()).toBe(true);
    expect(A.renderOrder).toBe(100);
    expect([B.renderOrder, D.renderOrder].every(ro => ro === 50)).toBe(true);
    expect(C.renderOrder).toBe(5);
    expect(C.material.opacity).toBeLessThan(1);
  });
});
