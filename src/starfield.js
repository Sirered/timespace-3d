// starfield.js
import * as THREE from 'three';

let group = null;
let _camera = null;
let _mode = 'slab'; // 'slab' | 'shell'
let _opts = {};
let _time = 0;
let _lastYaw = null;  

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
  camera.getWorldDirection(dir).normalize(); 
  const up = camera.up.clone().normalize();
  const right = new THREE.Vector3().crossVectors(dir, up).normalize();
  return { dir, up, right };
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// ----- layer builders -----
function makePointsLayer_Slab({
  count, sizePx, baseOpacity, tint, sprite, viewMult, depthOffset,
  camera, addTo, debugNoDepth, DPR, maxSizePx, pixelScale = 1
}) {
  const { width, height } = orthoViewSize(camera);
  const { dir, up, right } = cameraBasis(camera);

  const halfW = 0.5 * width  * viewMult;
  const halfH = 0.5 * height * viewMult;

  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const center = camera.position.clone().addScaledVector(dir, depthOffset);

  const offsets = [];

  for (let i = 0; i < count; i++) {
    const x = THREE.MathUtils.randFloat(-halfW, halfW);
    const y = THREE.MathUtils.randFloat(-halfH, halfH);
    offsets.push({x,y});

    const p = center.clone()
      .addScaledVector(right, x)
      .addScaledVector(up, y);

    positions[i*3+0] = p.x;
    positions[i*3+1] = p.y;
    positions[i*3+2] = p.z;

    const c = new THREE.Color(tint);
    const j = 0.5 + Math.pow(Math.random(), 2) * 1.5;
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
    size: clamp(sizePx * DPR * pixelScale, 1, maxSizePx * DPR * pixelScale),
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
    offsets,
    depthOffset, 
    scrollX: 0,
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

export function makePointsLayer_Shell({
  count = 1500,
  sprite,
  innerRadius = 100,
  depth = 30,
  baseOpacity = 0.9,
  tint = 0xffffff,
  sizePx = 3,
  DPR = 1,
  maxSizePx = 10,
  addTo = null,
  debugNoDepth = false
}) {
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const twinklePhases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Random point on a sphere shell
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const radius = innerRadius + Math.random() * depth;

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    positions.set([x, y, z], i * 3);

    // Random brightness scaling for twinkling + color depth
    const brightness = 0.5 + Math.pow(Math.random(), 2) * 1.5;
    const color = new THREE.Color(tint).multiplyScalar(brightness);
    colors.set([color.r, color.g, color.b], i * 3);

    // Star size
    sizes[i] = Math.min(maxSizePx, sizePx + Math.random() * 2);

    // Star's individual twinkle phase
    twinklePhases[i] = Math.random() * Math.PI * 2;
  }

  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geom.setAttribute('twinklePhase', new THREE.BufferAttribute(twinklePhases, 1));

  // Custom shader material with time-based twinkling
  const material = new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: sprite },
      time: { value: 0 },
      opacity: { value: baseOpacity },
      scale: { value: DPR },
      depthWrite: false,
depthTest: true,
    },
    vertexShader: `
      uniform float time;
      uniform float scale;
      attribute float size;
      attribute float twinklePhase;
      varying float vAlpha;
      varying vec3 vColor;

      void main() {
        vColor = color;

        float twinkle = 0.7 + 0.3 * sin(time + twinklePhase);
        vAlpha = twinkle;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * scale * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      uniform float opacity;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec4 texColor = texture2D(pointTexture, gl_PointCoord);
        gl_FragColor = vec4(vColor, opacity * texColor.a * vAlpha);
      }
    `,
    vertexColors: true,
    transparent: true,
    depthWrite: !debugNoDepth,
    depthTest: !debugNoDepth,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geom, material);
  points.renderOrder = -1000;


  if (addTo) {
    addTo.add(points);
  }

  return {
    mesh: points,
    update: (t) => {
      material.uniforms.time.value = t;
    }
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
    innerRadius = 120,
    depth = 30,

    pixelScale = 1,
    dprCap = 3,
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

  const DPR = Math.max(1, Math.min(dprCap, window.devicePixelRatio || 1));

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
          camera: _camera, addTo: group, debugNoDepth, DPR, maxSizePx, pixelScale
        })
      );
      pointLayers.push(
        makePointsLayer_Slab({
          count: Math.max(1, Math.floor(n2 / layerDepths.length)),
          sizePx: px(4.8),
          baseOpacity: Math.min(1, 1.00 * brightness),
          tint: 0xfff1cf,
          sprite, viewMult, depthOffset: d,
          camera: _camera, addTo: group, debugNoDepth, DPR, maxSizePx, pixelScale
        })
      );
      pointLayers.push(
        makePointsLayer_Slab({
          count: Math.max(1, Math.floor(n3 / layerDepths.length)),
          sizePx: px(7.0),
          baseOpacity: Math.min(1, 1.00 * brightness),
          tint: 0xffffff,
          sprite, viewMult, depthOffset: d,
          camera: _camera, addTo: group, debugNoDepth, DPR, maxSizePx, pixelScale
        })
      );
    }

    // big sprite stars on a middle layer
    //spriteStars.push(
    //  ...makeBigSprites_Slab({
    //    count: bigTwinkleCount,
    //    sprite,
    //    viewMult,
    //    depthOffset: bigSpriteDepth,
    //    camera: _camera,
    //  addTo: group,
    //  debugNoDepth,
    //  DPR,
    //  sizeRangePx: [10, 20],
    //  maxSizePx
    //})
    //);
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
  }
}

/** Optional: rebuild stars (e.g., after camera zoom change). */
export async function reseedStarfield(scene) {
  if (!scene) return;
  await initStarfield(scene, { camera: _camera, mode: _mode, ..._opts });
}

export function updateStarfield(dt = 0.016) {
  if (!group || !_camera) return;
  _time += dt;

  const look = new THREE.Vector3();
  _camera.getWorldDirection(look);
  let yaw = Math.atan2(look.x, look.z);              // [-PI, PI]
  if (_lastYaw === null) _lastYaw = yaw;
  let dYaw = yaw - _lastYaw;                          // wrap to [-PI, PI]
  if (dYaw > Math.PI) dYaw -= Math.PI * 2;
  if (dYaw < -Math.PI) dYaw += Math.PI * 2;
  _lastYaw = yaw;

  // screen extents for wrapping (use current zoom)
  const viewMult = _opts.viewMult ?? 1.35;
  const { width, height } = orthoViewSize(_camera);
  const halfW = 0.5 * width * viewMult;
  const halfH = 0.5 * height * viewMult;

  const { dir, up, right } = cameraBasis(_camera);

  for (const layer of pointLayers) {
    const { points, offsets, depthOffset } = layer;
    const pos = points.geometry.attributes.position.array;

    // farther layers drift less
    const depthFactor = 20 / Math.max(1, Math.abs(depthOffset)); // tune base=20
    const moveGain = 0.85;                                       // tune feel
    const move = -dYaw * halfW * moveGain * depthFactor;         // sign matches “background moves opposite to camera turn”
    layer.scrollX += move;
    layer.scrollX *= 0.98;                                       // friction

    const center = _camera.position.clone().addScaledVector(dir, depthOffset);

    for (let i = 0; i < offsets.length; i++) {
      let sx = offsets[i].x + layer.scrollX;
      let sy = offsets[i].y; // no vertical drift (equator lock); add if you add pitch

      // wrap in X to keep density constant
      if (sx >  halfW) sx -= 2 * halfW;
      if (sx < -halfW) sx += 2 * halfW;

      const p = center.clone()
        .addScaledVector(right, sx)
        .addScaledVector(up,    sy);

      const j = i * 3;
      pos[j    ] = p.x;
      pos[j + 1] = p.y;
      pos[j + 2] = p.z;
    }
    points.geometry.attributes.position.needsUpdate = true;
  }


  // Twinkle points
  for (const L of pointLayers) {
    const tw = 0.9 + 0.1 * Math.sin(_time * L.speed + L.phase);
    L.points.material.opacity = L.baseOpacity * tw;
  }

  // Twinkle + wobble for sprite stars
  for (const S of spriteStars) {
    const tw = 0.85 + 0.15 * Math.sin(_time * S.speed + S.phase);
    S.sprite.material.opacity = S.baseOpacity * tw;

    const s = S.sprite.scale.x * (1 + S.wobble * Math.sin(_time * (S.speed * 2) + S.phase * 1.7));
    S.sprite.scale.setScalar(clamp(s, 1, _opts.maxSizePx * (window.devicePixelRatio || 1)));

    // Reposition sprite based on view plane
    const { dir, up, right } = cameraBasis(_camera);
    const viewMult = _opts.viewMult || 1.35;
    const { width, height } = orthoViewSize(_camera);
    const halfW = 0.5 * width * viewMult;
    const halfH = 0.5 * height * viewMult;
    const x = THREE.MathUtils.randFloat(-halfW, halfW);
    const y = THREE.MathUtils.randFloat(-halfH, halfH);
    const center = _camera.position.clone().addScaledVector(dir, _opts.bigSpriteDepth || -15);
    const pos = center.clone()
      .addScaledVector(right, x)
      .addScaledVector(up, y);
    S.sprite.position.copy(pos);
  }
}

