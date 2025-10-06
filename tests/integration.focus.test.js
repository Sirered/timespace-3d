import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';

// Hoisted shared state for the mock
const h = vi.hoisted(() => ({ images: [] }));
vi.mock('../src/imageLoader.js', () => ({ orbitImages: h.images }));

import { setupScene } from '../src/setupScene.js';
import { setupCamera } from '../src/setupCamera.js';
import { setupFocusInteraction, updateFocus } from '../src/focusInteraction.js';

function makeSprite() {
  const mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: true, depthTest: true });
  const s = new THREE.Sprite(mat);
  s.scale.set(1.6, 1.6, 1);
  return s;
}
function prepCanvas(w = 960, h = 640) {
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
  canvas.dispatchEvent(new MouseEvent('pointerdown', {
    clientX: x, clientY: y, bubbles: true
  }));
}

describe('focusInteraction — integration', () => {
  let scene, camera, canvas, renderer;
  let A, B, C, D;

  beforeEach(() => {
    scene = setupScene();
    camera = setupCamera();

    canvas = prepCanvas();
    renderer = { domElement: canvas };

    h.images.length = 0;

    A = makeSprite(); A.position.set(0, 0, 0);
    B = makeSprite(); B.position.set(2, 1, 0);
    C = makeSprite(); C.position.set(-2, -1, 0);
    D = makeSprite(); D.position.set(0, 2.5, 0);

    scene.add(A, B, C, D);

    h.images.push(
      { mesh: A, record: { people: ['aa'] } },
      { mesh: B, record: { people: ['aa', 'bb'] } },
      { mesh: C, record: { people: ['cc'] } },
      { mesh: D, record: { people: ['aa'] } },
    );

    setupFocusInteraction({ scene, camera, renderer });
  });

  it('focused > ring > background ordering persists while animating; depth flags safe', () => {
    clickCanvas(canvas, camera, A.position);

    expect(A.renderOrder).toBe(100);
    expect(B.renderOrder).toBe(50);
    expect(D.renderOrder).toBe(50);
    expect(C.renderOrder).toBe(5);

    updateFocus(1000);
    updateFocus(2000);
    updateFocus(3000);

    expect(A.renderOrder).toBe(100);
    expect(B.renderOrder).toBe(50);
    expect(D.renderOrder).toBe(50);
    expect(C.renderOrder).toBe(5);

    [A, B, C, D].forEach(s => {
      expect(s.material.depthWrite).toBe(false);
      expect(s.material.depthTest).toBe(false);
    });
  });
});
