//// PLAN A(random speed and random phase)
// import * as THREE from 'three';
// import { supabase } from './supabaseClient.js';

// const orbitImages = [];
// const _texCache = new Map();

// /**
//  * Load images from Supabase:
//  * - Distribute them across two orbits with a 1:2 ratio (orbit 0 : orbit 1)
//  * - Assign evenly spaced phases per orbit so images maintain fixed spacing
//  */
// export async function loadImagesFromSupabase(scene) {
//   const { data, error } = await supabase
//     .from('imagerecord')
//     .select('file_name, people');

//   if (error || !data) {
//     console.error('Error fetching image records:', error);
//     return;
//   }

//   const pattern = [0, 1, 1]; // orbit assignment pattern → 1:2 ratio
//   let loadedCount = 0;       // only increment on successful load

//   for (let i = 0; i < data.length; i++) {
//     const record = data[i];
//     try {
//       const file = record.file_name;
//       const url = file; // file_name already contains a full URL

//       // load or reuse texture
//       let texture = _texCache.get(url);
//       if (!texture) {
//         texture = await new Promise((resolve, reject) => {
//           const loader = new THREE.TextureLoader();
//           loader.load(url, resolve, undefined, reject);
//         });
//         texture.colorSpace = THREE.SRGBColorSpace;
//         _texCache.set(url, texture);
//       }

//       // use Sprite for simplicity
//       const material = new THREE.SpriteMaterial({
//         map: texture,
//         depthTest: false,
//         depthWrite: false,
//         transparent: true,
//       });
//       const mesh = new THREE.Sprite(material);
//       mesh.scale.set(.7,.7, 1);
//       mesh.renderOrder = 10;

//       scene.add(mesh);

//       // Assign orbit according to [0,1,1] pattern (ratio 1:2)
//       const band = pattern[loadedCount % pattern.length];
//       loadedCount++;

//       orbitImages.push({
//         mesh,
//         // legacy fields (in case orbit path is missing, fallback to circular ring)
//         angle: Math.PI * 3,
//         orbitRadius: 5,
//         verticalOffset: 0,

//         // orbit motion modifiers
//         offsetX: -.5,
//         yLift: 0,
//         zChange: 0,

//         record: { ...record, people: Object.keys(record.people || {}) },

//         // animation parameters
//         phase: Math.random(), // will be reassigned later
//         speed: 0.3+Math.random()*0.4,

//         // orbit index: 0 → first orbit, 1 → second orbit
//         orbitBand: band,
//       });
//     } catch (e) {
//       console.warn('Failed to load texture:', record.file_name, e);
//       // note: loadedCount is not incremented on failure → ratio stays stable
//     }
//   }

//   console.log('[images] orbitImages count:', orbitImages.length);

//   // ====== evenly distribute images along each orbit ======
//   const groups = [[], []];
//   for (const img of orbitImages) {
//     const b = img.orbitBand === 1 ? 1 : 0; // ensure only 0/1 bands
//     groups[b].push(img);
//   }
// }

// export { orbitImages };


// PLAN B (same phase and speed) + "show up to 13 per orbit and reshuffle every 40s"

import * as THREE from 'three';
import { supabase } from './supabaseClient.js';

const orbitImages = [];
const _texCache = new Map();

// ===== shuffle timer guard (avoid duplicates across reloads) =====
let _shuffleTimer = null;

/* ===================== Tunables ===================== */
// Target pixels for processed LARGE images (only used to make textures; small images are never upscaled)
const LARGE_TARGET = { w: 1500, h: 1562 }; // ~0.96:1 portrait

// Visual sprite height (world units). Keep consistent and a bit smaller overall.
const WORLD_H_TOP = 0.75;     // orbitBand 0 (top)
const WORLD_H_BOTTOM = 0.75;  // orbitBand 1 (bottom)

// Per-orbit uniform speeds
const SPEED_TOP = 1.2;    // orbitBand 0
const SPEED_BOTTOM = 0.5; // orbitBand 1

// Show-at-most policy per orbit + reshuffle interval
const MAX_VISIBLE_PER_ORBIT = 13;
const RESHUFFLE_MS = 40000; // 40 seconds

// Optional face-centering for LARGE bucket
const CENTER_FACE = true;
const FACE_SCORE_MIN = 0.1;

/* ===================== Helpers ===================== */
function _ensureDims(list) {
  list.forEach(it => {
    const img = it.image;
    it.w = it.w || img?.naturalWidth || img?.width || 1;
    it.h = it.h || img?.naturalHeight || img?.height || 1;
    it.area = it.w * it.h;
  });
}

function _medianArea(list) {
  const arr = list.map(it => it.area).sort((a, b) => a - b);
  const n = arr.length;
  if (!n) return 0;
  return n % 2 ? arr[(n - 1) / 2] : Math.round((arr[n / 2 - 1] + arr[n / 2]) / 2);
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/* ===================== Face detection (optional) ===================== */
async function _estimateFocal(image) {
  const iw = image.naturalWidth || image.width || 1;
  const ih = image.naturalHeight || image.height || 1;
  if (!CENTER_FACE) return { fx: iw / 2, fy: ih / 2 };

  try {
    if ('FaceDetector' in window) {
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
      const faces = await detector.detect(image);
      if (faces && faces.length) {
        let best = null, bestArea = -1;
        for (const f of faces) {
          const bb = f.boundingBox;
          const area = (bb?.width || 0) * (bb?.height || 0);
          const score = f.probability ?? f.detectionConfidence ?? 1;
          if (area > bestArea && score >= FACE_SCORE_MIN) { bestArea = area; best = bb; }
        }
        if (best) {
          const fx = best.x + best.width / 2;
          const fy = best.y + best.height / 2;
          return {
            fx: Math.max(0, Math.min(iw, fx)),
            fy: Math.max(0, Math.min(ih, fy))
          };
        }
      }
    }
  } catch { /* ignore detector errors */ }
  return { fx: iw / 2, fy: ih / 2 };
}

/* ===================== Cover-crop (face-centered) for LARGE only ===================== */
function _coverFaceCenteredCanvas(image, target, focal) {
  const tw = target.w, th = target.h;
  const iw = image.naturalWidth || image.width || 1;
  const ih = image.naturalHeight || image.height || 1;
  const { fx = iw / 2, fy = ih / 2 } = focal || {};

  const sx = tw / iw, sy = th / ih;
  const scale = Math.max(sx, sy);
  const dw = Math.round(iw * scale);
  const dh = Math.round(ih * scale);

  let dx = Math.round(tw / 2 - fx * scale);
  let dy = Math.round(th / 2 - fy * scale);
  dx = Math.min(0, Math.max(tw - dw, dx));
  dy = Math.min(0, Math.max(th - dh, dy));

  const canvas = document.createElement('canvas');
  canvas.width = tw; canvas.height = th;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, iw, ih, dx, dy, dw, dh);

  return canvas;
}

/* ===================== Random helpers ===================== */
function _shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function _selectRandom(list, limit) {
  if (list.length <= limit) return [...list];
  const temp = [...list];
  _shuffleInPlace(temp);
  return temp.slice(0, limit);
}

/* ===================== Spacing & visibility ===================== */
function _applyUniformWorldHeight(list, worldH) {
  for (const e of list) {
    const tex = e.mesh.material.map;
    const tw = tex.image?.width  || tex.image?.videoWidth  || LARGE_TARGET.w;
    const th = tex.image?.height || tex.image?.videoHeight || LARGE_TARGET.h;
    const worldW = worldH * (tw / th);
    e.mesh.scale.set(worldW, worldH, 1);
  }
}

// set equal spacing and per-orbit speed for a "visible" subset; hide others
function _layoutOrbit(listAll, visibleSubset, speed) {
  const n = (visibleSubset?.length ?? 0);

  // Nothing to show in this band: hide all and bail early
  if (n === 0) {
    for (const e of listAll) {
      e.mesh.visible = false;
      e.speed = speed;
      e.phase = 0;
      e.bandIndex = 0;
      e.bandCount = 0;
    }
    return;
  }
  // keep a deterministic order within the chosen subset (optional: by file_name/uuid)
  visibleSubset.sort((a, b) => {
    const sa = a.record?.file_name || a.mesh.uuid;
    const sb = b.record?.file_name || b.mesh.uuid;
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });

  // visible: equal spacing
  for (let i = 0; i < n; i++) {
    const e = visibleSubset[i];
    e.bandIndex = i;
    e.bandCount = n;
    e.phase = i / n;
    e.angle = e.phase * Math.PI * 2;
    e.speed = speed;
    e.mesh.visible = true;
  }

  // hidden: invisible (speed/phase won’t matter)
  const hidden = listAll.filter(e => !visibleSubset.includes(e));
  for (const e of hidden) {
    e.mesh.visible = false;
  }
}

/* ===================== Main ===================== */
/**
 * - Fetch imagerecord(file_name, people) from Supabase
 * - Split by median area into small / large
 *   - large: face-centered "cover" crop to LARGE_TARGET
 *   - small: use original pixels (no upscale/crop/fill)
 * - Put larger-count bucket on bottom orbit (band 1), fewer on top (band 0)
 * - Per-orbit: unify world height so sprites look consistent in size
 * - Per-orbit: show at most 13 images; others stay hidden; reshuffle the visible subset every 40s
 */
export async function loadImagesFromSupabase(scene) {
  const { data, error } = await supabase
    .from('imagerecord')
    .select('file_name, people');

  if (error || !data) {
    console.error('Error fetching image records:', error);
    return;
  }

  // Load <img> elements
  const items = [];
  const tasks = data.map(async (record) => {
    const url = record.file_name; // file_name is already a full URL
    try {
      const image = await loadImageElement(url);
      items.push({
        src: url,
        image,
        record: { ...record, people: Object.keys(record.people || {}) },
      });
    } catch (e) {
      console.warn('Failed to load image:', url, e);
    }
  });
  await Promise.allSettled(tasks);

  if (!items.length) {
    console.warn('[imageLoader] No images loaded.');
    return;
  }

  // Bucket by median area
  _ensureDims(items);
  const medianArea = _medianArea(items);
  items.forEach(it => { it.bucket = (it.area <= medianArea) ? 'small' : 'large'; });

  // Build textures & sprites
  const smallGroup = [];
  const largeGroup = [];

  for (const it of items) {
    let texture;
    if (it.bucket === 'large') {
      // Normalize pixels for large bucket
      const focal = await _estimateFocal(it.image);
      const cacheKey = `${it.src}::LARGE::${LARGE_TARGET.w}x${LARGE_TARGET.h}::fx${Math.round(focal.fx)}-fy${Math.round(focal.fy)}`;
      texture = _texCache.get(cacheKey);
      if (!texture) {
        const canvas = _coverFaceCenteredCanvas(it.image, LARGE_TARGET, focal);
        texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        _texCache.set(cacheKey, texture);
      }
    } else {
      // Keep original pixels for small bucket
      const cacheKey = `${it.src}::ORIGINAL`;
      texture = _texCache.get(cacheKey);
      if (!texture) {
        texture = new THREE.Texture(it.image);
        texture.needsUpdate = true;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        _texCache.set(cacheKey, texture);
      }
    }

    const material = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      premultipliedAlpha: false,
    });
    
      const mesh = new THREE.Sprite(material);
      mesh.userData.basePx = 110;  // tweak 90–130 for phone, 140–180 for tablet
      mesh.renderOrder = 5;

    scene.add(mesh);

    const entry = {
      mesh,
      angle: 0,              // kept for circular fallback
      orbitRadius: 5,
      verticalOffset: 0,

      offsetX: -0.5,
      yLift: 0,
      zChange: 0,

      record: it.record,

      phase: Math.random(),
      speed: 1,

      orbitBand: 0,
      bandIndex: 0,
      bandCount: 0,
    };

    if (it.bucket === 'large') largeGroup.push(entry);
    else smallGroup.push(entry);
  }

  // Orbit assignment: more items → bottom (band 1), fewer → top (band 0)
  const BOTTOM = 1, TOP = 0;
  let bottomList, topList, bottomName, topName;
  if (largeGroup.length >= smallGroup.length) {
    bottomList = largeGroup;  bottomName = 'large';
    topList    = smallGroup;  topName    = 'small';
  } else {
    bottomList = smallGroup;  bottomName = 'small';
    topList    = largeGroup;  topName    = 'large';
  }
  bottomList.forEach(e => e.orbitBand = BOTTOM);
  topList.forEach(e => e.orbitBand = TOP);

  // Uniform world height per orbit
  _applyUniformWorldHeight(topList, WORLD_H_TOP);
  _applyUniformWorldHeight(bottomList, WORLD_H_BOTTOM);

  // ===== initial selection & layout (max 13 visible per orbit) =====
  function _initialLayout() {
    const topVisible = _selectRandom(topList, MAX_VISIBLE_PER_ORBIT);
    const botVisible = _selectRandom(bottomList, MAX_VISIBLE_PER_ORBIT);

    _layoutOrbit(topList, topVisible, SPEED_TOP);
    _layoutOrbit(bottomList, botVisible, SPEED_BOTTOM);
  }

  _initialLayout();

  // ===== periodic reshuffle every 40s =====
  if (_shuffleTimer) {
    clearInterval(_shuffleTimer);
    _shuffleTimer = null;
  }
  _shuffleTimer = setInterval(() => {
    try {
      const topVisible = _selectRandom(topList, MAX_VISIBLE_PER_ORBIT);
      const botVisible = _selectRandom(bottomList, MAX_VISIBLE_PER_ORBIT);

      _layoutOrbit(topList, topVisible, SPEED_TOP);
      _layoutOrbit(bottomList, botVisible, SPEED_BOTTOM);

      // Optional: log each reshuffle
      // console.log('[imageLoader] reshuffled', {
      //   topVisible: topVisible.length,
      //   bottomVisible: botVisible.length
      // });
    } catch (err) {
      console.warn('[imageLoader] reshuffle error:', err);
    }
  }, RESHUFFLE_MS);

  // Merge for animate.js consumption (it uses speed/phase/lookAt but respects mesh.visible)
  orbitImages.length = 0;
  for (const e of topList) orbitImages.push(e);
  for (const e of bottomList) orbitImages.push(e);

  console.log('[imageLoader] loaded', {
    counts: { small: smallGroup.length, large: largeGroup.length },
    placed: { top: topName, bottom: bottomName },
    worldHeight: { top: WORLD_H_TOP, bottom: WORLD_H_BOTTOM },
    speeds: { top: SPEED_TOP, bottom: SPEED_BOTTOM },
    maxVisiblePerOrbit: MAX_VISIBLE_PER_ORBIT,
    medianArea,
  });
}

export { orbitImages };
