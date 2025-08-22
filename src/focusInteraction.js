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
// ----------------------------------------------------------

let raycaster, mouse, dom, camera, scene;
let focusMode = false;
let focused = null;
let ring = [];
const SAVED = new WeakMap();
let ringCenter = new THREE.Vector3();
let ringAngle = 0;
let lastTime = 0;

const BASE_RING_SPEED = 0.5; // radians per second (tweak)
const HOVER_RING_SPEED = 0.2;


const RELATED_MAX = 8;
const FOCUS_DISTANCE = 7;
const RING_RADIUS = 5;
const RING_SCALE = 1.3;
const DIM_ALPHA = 0.25;

let isHoveringRing = false;

//slower when mouse hovering
function onMouseMove(e) {
  const rect = dom.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const ringMeshes = ring.map(r => r.mesh);
  const intersects = raycaster.intersectObjects(ringMeshes, true);

  isHoveringRing = intersects.length > 0;
}

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
  tween(mesh.position, { x: s.position.x, y: s.position.y, z: s.position.z });
  mesh.quaternion.copy(s.quaternion);
  tween(mesh.scale, { x: s.scale.x, y: s.scale.y, z: s.scale.z });
  if ('opacity' in mesh.material) mesh.material.opacity = s.opacity;
  mesh.renderOrder = s.renderOrder ?? 0;
}

function isRelated(aRecord, bRecord) {
  // People might already be an array (from the loader) or still be an object.
  const a = Array.isArray(aRecord?.people)
    ? aRecord.people
    : Object.keys(aRecord?.people || {});
  const b = Array.isArray(bRecord?.people)
    ? bRecord.people
    : Object.keys(bRecord?.people || {});

  if (!a.length || !b.length) return false;

  const setA = new Set(a);
  return b.some(p => setA.has(p));  // overlap = related
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

  ring.forEach(o => {
    const a = o.baseAngle + angleOffset;
    const pos = ringCenter.clone()
      .addScaledVector(right, Math.cos(a) * RING_RADIUS)
      .addScaledVector(up,    Math.sin(a) * RING_RADIUS)
      .addScaledVector(viewDir, -0.05); // tiny nudge toward camera

    o.mesh.position.copy(pos);
    o.mesh.lookAt(camera.position);
    o.mesh.renderOrder = 8;
  });
}



function moveInFrontOfCamera(mesh) {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const target = camera.position.clone().add(dir.multiplyScalar(FOCUS_DISTANCE));

  saveOriginal(mesh);
  tween(mesh.position, { x: target.x, y: target.y, z: target.z });
  mesh.lookAt(camera.position);
  tween(mesh.scale, { x: mesh.scale.x * 4, y: mesh.scale.y * 4, z: mesh.scale.z * 4 });
  mesh.renderOrder = 9;
}

function dimAllExcept(keep = new Set()) {
  orbitImages.forEach(({ mesh }) => {
    if (!('opacity' in mesh.material)) return;
    const target = keep.has(mesh) ? 1.0 : DIM_ALPHA;
    mesh.material.transparent = true;
    mesh.material.depthWrite = false;
    mesh.material.opacity = target;
  });
}

function undimAll() {
  orbitImages.forEach(({ mesh }) => {
    const s = SAVED.get(mesh);
    if (s && 'opacity' in mesh.material) {
      mesh.material.opacity = s.opacity;
    } else if ('opacity' in mesh.material) {
      mesh.material.opacity = 1.0;
    }
    mesh.material.depthWrite = true;
  });
}

export function clearFocus() {
  if (!focusMode) return;
  focusMode = false;

  ring.forEach(({ mesh }) => restoreOriginal(mesh));
  ring.length = 0;

  if (focused) {
    restoreOriginal(focused.mesh);
    focused = null;
  }
  undimAll();
}

function focusImage(picked) {
  focusMode = true;
  focused = picked;
  moveInFrontOfCamera(picked.mesh);

  const related = orbitImages
    .filter(o => o.mesh !== picked.mesh && isRelated(picked.record, o.record))
    .slice(0, RELATED_MAX);

  // center in front of camera (updated each frame too)
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  ringCenter.copy(camera.position).add(dir.multiplyScalar(FOCUS_DISTANCE));

  ring = related.map((o, i) => {
    saveOriginal(o.mesh);
    // assign evenly spaced base angles
    o.baseAngle = (i / Math.max(related.length, 1)) * Math.PI * 2;
    return o;
  });

  // place once immediately (no motion yet)
  placeRing(0);

  const keep = new Set([picked.mesh, ...related.map(r => r.mesh)]);
  dimAllExcept(keep);

  //scale ring image
  ring.forEach(({ mesh }) => {
  tween(mesh.scale, {
      x: mesh.scale.x * RING_SCALE,
      y: mesh.scale.y * RING_SCALE,
      z: mesh.scale.z * RING_SCALE,
    }, 300);
  });
}


function onClick(e) {
  const rect = dom.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Determine allowed meshes depending on mode
  let allowedMeshes;
  if (!focusMode) {
    // Not in focus mode — allow all orbit images
    allowedMeshes = orbitImages.map(o => o.mesh);
  } else {
    // In focus mode — only allow the focused one or its surrounding ring
    const ringMeshes = ring.map(r => r.mesh);
    allowedMeshes = [focused.mesh, ...ringMeshes];
  }

  const intersects = raycaster.intersectObjects(allowedMeshes, true);
  if (!intersects.length) {
    // Clicked empty space — if in focus, clear it
    clearFocus();
    return;
  }

  const mesh = intersects[0].object;
  const picked = orbitImages.find(o => o.mesh === mesh);
  if (!picked) return;

  if (focused && focused.mesh === mesh) {
    // Clicking the focused image again — clear focus
    clearFocus();
    return;
  }

  // If we're in focus mode, we know picked is in the ring here
  if (focusMode) {
    // Switch focus to the clicked surrounding image
    clearFocus();
    focusImage(picked); // Move logic below into a reusable function
    return;
  }

  // Not in focus mode — focus normally
  focusImage(picked);
}


function onKey(e) {
  if (e.key === 'Escape') clearFocus();
}

export function updateFocus(time) {
  updateTweens(time);

  if (!focusMode || ring.length === 0) return;

  // delta time (ms -> s)
  if (!lastTime) lastTime = time;
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  // keep center locked in front of camera (in case camera moves)
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  ringCenter.copy(camera.position).add(dir.multiplyScalar(FOCUS_DISTANCE));

  // // advance ring and place
  // ringAngle = (ringAngle + RING_SPEED * dt) % (Math.PI * 2);
  const currentSpeed = isHoveringRing ? HOVER_RING_SPEED : BASE_RING_SPEED;
  ringAngle = (ringAngle + currentSpeed * dt) % (Math.PI * 2);
  placeRing(ringAngle);
}

export function setupFocusInteraction({ scene: _scene, camera: _camera, renderer }) {
  scene = _scene;
  camera = _camera;
  dom = renderer.domElement;
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  dom.addEventListener('click', onClick);
  dom.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', onKey);
}

export function isFocusMode() {
  return focusMode;
}
