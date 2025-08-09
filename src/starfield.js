// starfield.js
import * as THREE from 'three';

let group = null;
let _camera = null;
let _mode = 'slab'; // 'slab' | 'shell'
let _opts = {};
let _time = 0;

const pointLayers = [];
const spriteStars = [];

// ----- helpers -----
function disposeGroup(g) {
  if (!g) return;
  g.traverse(o => {
    o.geometry?.dispose?.();
    o.material?.dispose?.();
  });
}

function orthoViewSize(camera) {
  // visible size in world units for an OrthographicCamera
  const width  = (camera.right - camera.left) / (camera.zoom || 1);
  const height = (camera.top   - camera.bottom) / (camera.zoom || 1);
  return { width, height };
}

function cameraBasis(camera) {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);                 // look direction
  const up = camera.up.clone().normalize();
  const right = new THREE.Vector3().crossVectors(up, dir).normalize();
  return { dir, up, right };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// ----- layer builders -----
function makePointsLayer_Slab({
  count, sizePx, baseOpacity, tint, sprite, viewMult, depthOffset,
  camera, addTo, debugNoDepth, DPR, maxSizePx
}) {
  const { width, height } = orthoViewSize(camera);
  const { dir, up, right } = cameraBasis(camera);

  const halfW = 0.5 * width  * viewMult;
  const halfH = 0.5 * height * viewMult;

  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const center = camera.position.clone().addScaledVector(dir, depthOffset);

  for (let i = 0; i < count; i++) {
    const x = THREE.MathUtils.randFloat(-halfW, halfW);
    const y = THREE.MathUtils.randFloat(-halfH, halfH);

    const p = center.clone()
      .addScaledVector(right, x)
      .addScaledVector(up, y);

    positions[i*3+0] = p.x;
    positions[i*3+1] = p.y;
    positions[i*3+2] = p.z;

    const c = new THREE.Color(tint);
    const j = 0.9 + Math.random() * 0.2;
    colors[i*3+0] = c.r * j;
    colors[i*3+1] = c.g * j;
    colors[i*3+2] = c.b * j;
  }

  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    map: sprite,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: !debugNoDepth,
    depthWrite: false,
    size: clamp(sizePx * DPR, 1, maxSizePx * DPR),   // cap size
    sizeAttenuation: false,                          // ortho-friendly
    opacity: baseOpacity,
  });

  const points = new THREE.Points(geom, mat);
  points.renderOrder = -1000;
  addTo.add(points);

  return {
    points,
    baseOpacity,
    speed: THREE.MathUtils.randFloat(0.7, 1.2),
    phase: Math.random() * Math.PI * 2,
  };
}

function makeBigSprites_Slab({
  count, sprite, viewMult, depthOffset,
  camera, addTo, debugNoDepth, DPR, sizeRangePx, maxSizePx
}) {
  const { width, height } = orthoViewSize(camera);
  const { dir, up, right } = cameraBasis(camera);
  const halfW = 0.5 * width  * viewMult;
  const halfH = 0.5 * height * viewMult;

  const center = camera.position.clone().addScaledVector(dir, depthOffset);

  const out = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({
      map: sprite,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: !debugNoDepth,
      depthWrite: false,
      opacity: THREE.MathUtils.randFloat(0.75, 1.0),
    });
    const s = new THREE.Sprite(mat);

    const x = THREE.MathUtils.randFloat(-halfW, halfW);
    const y = THREE.MathUtils.randFloat(-halfH, halfH);
    const pos = center.clone()
      .addScaledVector(right, x)
      .addScaledVector(up, y);
    s.position.copy(pos);

    const px = clamp(
      THREE.MathUtils.randFloat(sizeRangePx[0], sizeRangePx[1]) * DPR,
      1,
      maxSizePx * DPR
    );
    s.scale.setScalar(px);
    s.renderOrder = -999;
    addTo.add(s);

    out.push({
      sprite: s,
      baseOpacity: s.material.opacity,
      speed: THREE.MathUtils.randFloat(0.6, 1.0),
      phase: Math.random() * Math.PI * 2,
      wobble: THREE.MathUtils.randFloat(0.001, 0.003),
    });
  }
  return out;
}

function makePointsLayer_Shell({
  count, sizePx, baseOpacity, tint, sprite,
  innerRadius, depth, addTo, debugNoDepth, DPR, maxSizePx
}) {
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const dir = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(2),
      THREE.MathUtils.randFloatSpread(2),
      THREE.MathUtils.randFloatSpread(2)
    ).normalize();

    const r = innerRadius + Math.random() * depth;
    const p = dir.multiplyScalar(r);
    positions[i*3+0] = p.x;
    positions[i*3+1] = p.y;
    positions[i*3+2] = p.z;

    const c = new THREE.Color(tint);
    const j = 0.9 + Math.random() * 0.2;
    colors[i*3+0] = c.r * j;
    colors[i*3+1] = c.g * j;
    colors[i*3+2] = c.b * j;
  }

  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    map: sprite,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    depthTest: !debugNoDepth,
    blending: THREE.AdditiveBlending,
    size: clamp(sizePx * DPR, 1, maxSizePx * DPR),
    sizeAttenuation: false,
    opacity: baseOpacity,
  });

  const points = new THREE.Points(geom, mat);
  points.renderOrder = -1000;
  addTo.add(points);

  return {
    points,
    baseOpacity,
    speed: THREE.MathUtils.randFloat(0.7, 1.2),
    phase: Math.random() * Math.PI * 2,
  };
}

// ----- API -----

/**
 * Initialize starfield.
 * mode = 'slab' (default): populate only the camera’s ortho view (plus margin),
 *                          so fewer points look dense.
 * mode = 'shell': old spherical shell around origin.
 */
export async function initStarfield(
  scene,
  {
    camera,
    mode = 'slab',

    // shared
    count = 2800,            // total points (slab needs far fewer)
    brightness = 1.15,
    sizeMult = 1.15,
    maxSizePx = 10,          // hard cap for any star’s pixel size
    bigTwinkleCount = 45,    // sprite stars
    textureURL = '/Star2.png',
    debugNoDepth = false,

    // slab options
    viewMult = 1.35,         // expand beyond viewport for margin
    depthOffsets = [-40, -20, 0], // layers in world units along view dir
    bigSpriteDepth = -15,    // where to place big sprites

    // shell options
    innerRadius = 35,
    depth = 55,
  } = {}
) {
  // keep references/options for reseeding
  _camera = camera || _camera;
  _mode = mode;
  _opts = {
    count, brightness, sizeMult, maxSizePx, bigTwinkleCount, textureURL, debugNoDepth,
    viewMult, depthOffsets, bigSpriteDepth, innerRadius, depth
  };

  if (!scene) throw new Error('initStarfield: scene required');
  if (!_camera) throw new Error('initStarfield: camera required for slab mode');

  // cleanup
  if (group) {
    scene.remove(group);
    disposeGroup(group);
  }
  group = new THREE.Group();
  scene.add(group);

  pointLayers.length = 0;
  spriteStars.length = 0;
  _time = 0;

  // load texture
  const sprite = await new Promise((res) =>
    new THREE.TextureLoader().load(
      textureURL,
      t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; res(t); },
      undefined,
      () => res(null)
    )
  );

  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  // split counts (small/mid/big points)
  const n1 = Math.floor(count * 0.70);
  const n2 = Math.floor(count * 0.25);
  const n3 = Math.floor(count * 0.05);

  const px = (p) => p * sizeMult;

  if (mode === 'slab') {
    // Build a few depth layers inside the current view
    const layerDepths = Array.isArray(depthOffsets) ? depthOffsets : [0];

    // distribute the total across layers (same ratios per layer)
    for (const d of layerDepths) {
      pointLayers.push(
        makePointsLayer_Slab({
          count: Math.max(1, Math.floor(n1 / layerDepths.length)),
          sizePx: px(3.2),
          baseOpacity: Math.min(1, 0.85 * brightness),
          tint: 0x9ecbff,
          sprite, viewMult, depthOffset: d,
          camera: _camera, addTo: group, debugNoDepth, DPR, maxSizePx
        })
      );
      pointLayers.push(
        makePointsLayer_Slab({
          count: Math.max(1, Math.floor(n2 / layerDepths.length)),
          sizePx: px(4.8),
          baseOpacity: Math.min(1, 1.00 * brightness),
          tint: 0xfff1cf,
          sprite, viewMult, depthOffset: d,
          camera: _camera, addTo: group, debugNoDepth, DPR, maxSizePx
        })
      );
      pointLayers.push(
        makePointsLayer_Slab({
          count: Math.max(1, Math.floor(n3 / layerDepths.length)),
          sizePx: px(7.0),
          baseOpacity: Math.min(1, 1.00 * brightness),
          tint: 0xffffff,
          sprite, viewMult, depthOffset: d,
          camera: _camera, addTo: group, debugNoDepth, DPR, maxSizePx
        })
      );
    }

    // big sprite stars on a middle layer
    spriteStars.push(
      ...makeBigSprites_Slab({
        count: bigTwinkleCount,
        sprite,
        viewMult,
        depthOffset: bigSpriteDepth,
        camera: _camera,
        addTo: group,
        debugNoDepth,
        DPR,
        sizeRangePx: [10, 20],
        maxSizePx
      })
    );
  } else {
    // sphere shell fallback
    pointLayers.push(
      makePointsLayer_Shell({
        count: n1, sizePx: px(3.2), baseOpacity: Math.min(1, 0.85 * brightness),
        tint: 0x9ecbff, sprite, innerRadius, depth, addTo: group, debugNoDepth, DPR, maxSizePx
      })
    );
    pointLayers.push(
      makePointsLayer_Shell({
        count: n2, sizePx: px(4.8), baseOpacity: Math.min(1, 1.00 * brightness),
        tint: 0xfff1cf, sprite, innerRadius, depth, addTo: group, debugNoDepth, DPR, maxSizePx
      })
    );
    pointLayers.push(
      makePointsLayer_Shell({
        count: n3, sizePx: px(7.0), baseOpacity: Math.min(1, 1.00 * brightness),
        tint: 0xffffff, sprite, innerRadius, depth, addTo: group, debugNoDepth, DPR, maxSizePx
      })
    );

    // sparse big sprites on shell center (origin)
    spriteStars.push(
      ...makeBigSprites_Slab({
        count: bigTwinkleCount,
        sprite,
        viewMult: 2.0,
        depthOffset: 0,
        camera: _camera,
        addTo: group,
        debugNoDepth,
        DPR,
        sizeRangePx: [12, 22],
        maxSizePx
      })
    );
  }
}

/** Optional: rebuild stars (e.g., after camera zoom change). */
export async function reseedStarfield(scene) {
  if (!scene) return;
  await initStarfield(scene, { camera: _camera, mode: _mode, ..._opts });
}

export function updateStarfield(dt = 0.016) {
  if (!group) return;
  _time += dt;

  // subtle drift
  group.rotation.y = Math.sin(_time * 0.07) * 0.02;

  // twinkle layers
  for (const L of pointLayers) {
    const tw = 0.9 + 0.1 * Math.sin(_time * L.speed + L.phase);
    L.points.material.opacity = L.baseOpacity * tw;
  }

  // twinkle + tiny wobble for sprite stars
  for (const S of spriteStars) {
    const tw = 0.85 + 0.15 * Math.sin(_time * S.speed + S.phase);
    S.sprite.material.opacity = S.baseOpacity * tw;
    const s = S.sprite.scale.x * (1 + S.wobble * Math.sin(_time * (S.speed * 2) + S.phase * 1.7));
    S.sprite.scale.setScalar(clamp(s, 1, _opts.maxSizePx * (window.devicePixelRatio || 1)));
  }
}
