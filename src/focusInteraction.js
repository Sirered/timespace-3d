// focusInteraction.js
import * as THREE from 'three';
import { orbitImages } from './imageLoader.js';

// ------------------- tiny tween helper -------------------
const tweens = new Set();
function tween(obj, to, ms = 600, ease = t => 1 - Math.pow(1 - t, 3)) {
  const from = {};
  Object.keys(to).forEach(k => (from[k] = obj[k]));
  const t0 = performance.now();
  const tw = {
    obj, from, to, ms, ease, done: false,
    step(now) {
      const u = Math.min(1, (now - t0) / ms);
      const e = ease(u);
      Object.keys(to).forEach(k => (obj[k] = from[k] + (to[k] - from[k]) * e));
      if (u >= 1) this.done = true;
    }
  };
  tweens.add(tw);
}
function updateTweens(time) {
  for (const tw of Array.from(tweens)) {
    tw.step(time);
    if (tw.done) tweens.delete(tw);
  }
}
function cancelTweensFor(obj) {
  for (const tw of Array.from(tweens)) {
    if (tw.obj === obj) tweens.delete(tw);
  }
}
// ----------------------------------------------------------

let raycaster, mouse, dom, camera, scene, controls;
let focusMode = false;
let focused = null;
let ring = [];
const SAVED = new WeakMap();
let ringCenter = new THREE.Vector3();
let ringAngle = 0;
let lastTime = 0;

const BASE_RING_SPEED = 0.5;   // rad/s
const HOVER_RING_SPEED = 0.2;

const RELATED_MAX = 8;
const DIM_ALPHA = 0.25;
const ORDER_BG = 5, ORDER_RING = 50, ORDER_FOCUS = 100;

let isHoveringRing = false;

// Debounce to avoid double-trigger (pointerdown + click, etc.)
let _lastActionTs = 0;
const ACTION_DEBOUNCE_MS = 160;

// Dynamic sizing based on current ortho view
function focusParams() {
  // stable across aspect ratios
  const viewH = (camera.top - camera.bottom) / (camera.zoom || 1); // 10 at zoom=1
  const base  = viewH;

  return {
    FOCUS_DISTANCE: base * 0.70, 
    RING_RADIUS:    base * 0.45,  
    RING_SCALE:     1.30          
  };
}

// ------------------- pointer handlers -------------------
function onPointerMove(e) {
  const rect = dom.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const ringMeshes = ring.map(r => r.mesh);
  const intersects = raycaster.intersectObjects(ringMeshes, true);
  isHoveringRing = intersects.length > 0;
}

function onPointerDown(e) {
  const now = performance.now();
  if (now - _lastActionTs < ACTION_DEBOUNCE_MS) return;
  _lastActionTs = now;

  const rect = dom.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  let allowedMeshes;
  if (!focusMode) {
    allowedMeshes = orbitImages.filter(o => o.mesh?.visible).map(o => o.mesh);
  } else {
    const ringMeshes = ring.map(r => r.mesh);
    allowedMeshes = [focused.mesh, ...ringMeshes];
  }

  const intersects = raycaster.intersectObjects(allowedMeshes, true);
  if (!intersects.length) {
    if (focusMode) clearFocus(); // exit w/ tween when clicking empty space
    return;
  }

  const mesh = intersects[0].object;
  const picked = orbitImages.find(o => o.mesh === mesh);
  if (!picked) return;

  if (focusMode) {
    // Switching focus to a ring member: instant restore then refocus.
    if (focused && focused.mesh === mesh) return; // no-op if same
    clearFocus({ instant: true });
    focusImage(picked);
    return;
  }

  // normal focus
  focusImage(picked);
}


// ------------------- helpers -------------------
function saveOriginal(mesh) {
  if (SAVED.has(mesh)) return;
  SAVED.set(mesh, {
    position: mesh.position.clone(),
    quaternion: mesh.quaternion.clone(),
    scale: mesh.scale.clone(),
    opacity: ('opacity' in mesh.material) ? mesh.material.opacity : 1,
    renderOrder: mesh.renderOrder,
  });
}

function restoreOriginal(mesh) {
  const s = SAVED.get(mesh);
  if (!s) return;
  cancelTweensFor(mesh.position);
  cancelTweensFor(mesh.scale);
  tween(mesh.position, { x: s.position.x, y: s.position.y, z: s.position.z });
  mesh.quaternion.copy(s.quaternion);
  tween(mesh.scale, { x: s.scale.x, y: s.scale.y, z: s.scale.z });
  if ('opacity' in mesh.material) mesh.material.opacity = s.opacity;
  mesh.renderOrder = s.renderOrder ?? 0;
}

function restoreOriginalInstant(mesh) {
  const s = SAVED.get(mesh);
  if (!s) return;
  cancelTweensFor(mesh.position);
  cancelTweensFor(mesh.scale);
  mesh.position.copy(s.position);
  mesh.quaternion.copy(s.quaternion);
  mesh.scale.copy(s.scale);
  if ('opacity' in mesh.material) mesh.material.opacity = s.opacity;
  mesh.renderOrder = s.renderOrder ?? 0;
}

function isRelated(aRecord, bRecord) {
  const a = Array.isArray(aRecord?.people)
    ? aRecord.people
    : Object.keys(aRecord?.people || {});
  const b = Array.isArray(bRecord?.people)
    ? bRecord.people
    : Object.keys(bRecord?.people || {});
  if (!a.length || !b.length) return false;
  const setA = new Set(a);
  return b.some(p => setA.has(p));
}

function getCameraBasis() {
  const viewDir = new THREE.Vector3();
  camera.getWorldDirection(viewDir);
  const up = camera.up.clone().normalize();
  const right = new THREE.Vector3().crossVectors(up, viewDir).normalize();
  return { right, up, viewDir };
}

function placeRing(angleOffset) {
  const { right, up, viewDir } = getCameraBasis();
  const { RING_RADIUS } = focusParams();

  ring.forEach(o => {
    const a = o.baseAngle + angleOffset;
    const pos = ringCenter.clone()
      .addScaledVector(right, Math.cos(a) * RING_RADIUS)
      .addScaledVector(up,    Math.sin(a) * RING_RADIUS)
      .addScaledVector(viewDir, -0.05);
    o.mesh.position.copy(pos);
    o.mesh.lookAt(camera.position);
    o.mesh.renderOrder = ORDER_RING;
    if ('depthWrite' in o.mesh.material) o.mesh.material.depthWrite = false;
    if ('depthTest'  in o.mesh.material) o.mesh.material.depthTest  = false;
  });
}

function moveInFrontOfCamera(mesh) {
  const { FOCUS_DISTANCE } = focusParams();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const target = camera.position.clone().add(dir.multiplyScalar(FOCUS_DISTANCE));

  saveOriginal(mesh);
  tween(mesh.position, { x: target.x, y: target.y, z: target.z });
  mesh.lookAt(camera.position);
  tween(mesh.scale, { x: mesh.scale.x * 4, y: mesh.scale.y * 4, z: mesh.scale.z * 4 });
  mesh.renderOrder = ORDER_FOCUS;
  if ('depthWrite' in mesh.material) mesh.material.depthWrite = false;
  if ('depthTest'  in mesh.material) mesh.material.depthTest  = false;
}

function dimAllExcept(keep = new Set()) {
  orbitImages.forEach(({ mesh }) => {
    if (!mesh?.visible) return;
    if (!('opacity' in mesh.material)) return;
    const isKept = keep.has(mesh);
    mesh.material.transparent = true;
    if ('depthWrite' in mesh.material) mesh.material.depthWrite = false;
    if ('depthTest'  in mesh.material) mesh.material.depthTest  = false;
    mesh.material.opacity = isKept ? 1.0 : DIM_ALPHA;
    if (!isKept) mesh.renderOrder = ORDER_BG;
  });
}

function undimAll() {
  orbitImages.forEach(({ mesh }) => {
    if (!mesh?.visible) return;
    const s = SAVED.get(mesh);
    if (s && 'opacity' in mesh.material) {
      mesh.material.opacity = s.opacity;
    } else if ('opacity' in mesh.material) {
      mesh.material.opacity = 1.0;
    }
    if ('depthWrite' in mesh.material) mesh.material.depthWrite = false;
    if ('depthTest'  in mesh.material) mesh.material.depthTest  = false;
    mesh.renderOrder = ORDER_BG;
  });
}

export function clearFocus(opts = {}) {
  if (!focusMode) return;
  const instant = !!opts.instant;
  focusMode = false;

  // unlock focused & resume reshuffle
  if (focused?.mesh) focused.mesh.userData.lockVisible = false;
  if (typeof window !== 'undefined') window.__freezeOrbitShuffle = false;

  // restore ring members
  ring.forEach(({ mesh }) => instant ? restoreOriginalInstant(mesh) : restoreOriginal(mesh));
  ring.length = 0;

  // restore focused
  if (focused) {
    instant ? restoreOriginalInstant(focused.mesh) : restoreOriginal(focused.mesh);
    focused = null;
  }

    undimAll();
    orbitImages.forEach(({ mesh }) => {
      if (mesh) mesh.renderOrder = ORDER_BG;
    });
  
  if (controls) controls.enabled = true;
}

function focusImage(picked) {
  focusMode = true;
  lastTime = performance.now();

  // lock focused & freeze random reshuffle globally
  picked.mesh.userData.lockVisible = true;
  if (typeof window !== 'undefined') window.__freezeOrbitShuffle = true;

  focused = picked;

  // selected goes to center
  moveInFrontOfCamera(picked.mesh);
  if (controls) controls.enabled = false;

  const related = orbitImages
    .filter(o => o.mesh?.visible && o.mesh !== picked.mesh && isRelated(picked.record, o.record))
    .slice(0, RELATED_MAX);

  const { FOCUS_DISTANCE, RING_SCALE } = focusParams();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  ringCenter.copy(camera.position).add(dir.multiplyScalar(FOCUS_DISTANCE));

  for (const o of related) {
    saveOriginal(o.mesh);
    const saved = SAVED.get(o.mesh);
    if (saved) {
      cancelTweensFor(o.mesh.scale);
      o.mesh.scale.copy(saved.scale);
    }
  }

  // build new ring
  ring = related.map((o, i) => {
    o.baseAngle = (i / Math.max(related.length, 1)) * Math.PI * 2;
    return o;
  });

  // place once immediately
  placeRing(0);

  const keep = new Set([picked.mesh, ...related.map(r => r.mesh)]);
  dimAllExcept(keep);

  picked.mesh.renderOrder = ORDER_FOCUS;
  ring.forEach(({ mesh }) => { mesh.renderOrder = ORDER_RING; });

  // scale ring images from baseline → RING_SCALE
  ring.forEach(({ mesh }) => {
    const saved = SAVED.get(mesh);
    if (!saved) return;
    cancelTweensFor(mesh.scale);
    mesh.scale.copy(saved.scale); // baseline
    tween(mesh.scale, {
      x: saved.scale.x * RING_SCALE,
      y: saved.scale.y * RING_SCALE,
      z: saved.scale.z * RING_SCALE,
    }, 300);
  });
}

// ------------------- loop -------------------
function onKey(e) {
  if (e.key === 'Escape') clearFocus();
}

export function updateFocus(time) {
  updateTweens(time);

  if (!focusMode || ring.length === 0) return;

  if (!lastTime) lastTime = time;
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  // keep center locked in front of camera (in case camera moves)
  const { FOCUS_DISTANCE } = focusParams();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  ringCenter.copy(camera.position).add(dir.multiplyScalar(FOCUS_DISTANCE));

  const currentSpeed = isHoveringRing ? HOVER_RING_SPEED : BASE_RING_SPEED;
  ringAngle = (ringAngle + currentSpeed * dt) % (Math.PI * 2);
  placeRing(ringAngle);
}

export function setupFocusInteraction({ scene: _scene, camera: _camera, renderer, controls: _controls }) {
  scene = _scene;
  camera = _camera;
  controls = _controls || null;
  dom = renderer.domElement;
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Pointer events only (works for mouse & touch); avoid double-firing with click/mousemove
  dom.addEventListener('pointermove', onPointerMove, { passive: true });
  dom.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKey);
}

export function isFocusMode() {
  return focusMode;
}
