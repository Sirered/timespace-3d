// nebula.js
import * as THREE from 'three';

let _group = null;
let _camera = null;
const _layers = [];
let _time = 0;

function orthoViewSize(camera) {
  const width  = (camera.right - camera.left) / (camera.zoom || 1);
  const height = (camera.top   - camera.bottom) / (camera.zoom || 1);
  return { width, height };
}

function cameraBasis(camera) {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir); // forward (camera -Z in world)
  const up = camera.up.clone().normalize();
  const right = new THREE.Vector3().crossVectors(up, dir).normalize();
  return { dir, up, right };
}

function makeNebulaMaterial({
  colorA = 0x0a1640,
  colorB = 0x7aa6ff,
  opacity = 0.28,          // a bit stronger so it's visible
  noiseScale = 1.6,
  flow = [0.012, 0.006],
  intensity = 1.0,
} = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime:       { value: 0 },
      uColorA:     { value: new THREE.Color(colorA) },
      uColorB:     { value: new THREE.Color(colorB) },
      uOpacity:    { value: opacity },
      uNoiseScale: { value: noiseScale },
      uFlow:       { value: new THREE.Vector2(flow[0], flow[1]) },
      uIntensity:  { value: intensity },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3  uColorA, uColorB;
      uniform float uOpacity, uNoiseScale, uIntensity;
      uniform vec2  uFlow;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.,0.));
        float c = hash(i + vec2(0.,1.));
        float d = hash(i + vec2(1.,1.));
        vec2 u = f*f*(3. - 2.*f);
        return mix(a, b, u.x) + (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
      }
      float fbm(vec2 p){
        float v = 0.0;
        float a = 0.5;
        for (int i=0; i<5; i++){
          v += a * noise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main(){
        vec2 uv = vUv * uNoiseScale + uFlow * uTime;
        float n = fbm(uv);
        float m = pow(n, 1.8);
        vec2 edge = smoothstep(0.0, 0.12, vUv) * smoothstep(0.0, 0.12, 1.0 - vUv);
        float vignette = edge.x * edge.y;
        vec3 col = mix(uColorA, uColorB, m);
        float alpha = uOpacity * m * vignette * uIntensity;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthTest: true,     // other content will correctly draw over it
    depthWrite: false,   // but the nebula won't write depth
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide, // important: visible regardless of facing
  });
}

function makeLayer({ addTo, depthOffset = 80, viewMult = 1.4, material } = {}) {
  if (!addTo) throw new Error('makeLayer: addTo (group) is required');
  if (!material) throw new Error('makeLayer: material is required');

  const geom = new THREE.PlaneGeometry(1, 1, 1, 1);
  const mesh = new THREE.Mesh(geom, material); // geometry first
  mesh.renderOrder = -2000; // behind starfield (-1000) & all your content
  addTo.add(mesh);
  return { mesh, depthOffset, viewMult, material };
}

export function initNebula(scene, {
  camera,
  layers = [
    { depthOffset: 80,  viewMult: 1.5, noiseScale: 1.4, opacity: 0.30, flow: [ 0.010, 0.004], colorA: 0x08122f, colorB: 0x6e98ff, intensity: 1.0 },
    { depthOffset: 120, viewMult: 1.8, noiseScale: 2.2, opacity: 0.20, flow: [-0.006, 0.003], colorA: 0x0b0f2a, colorB: 0x9e7cff, intensity: 0.9 },
  ],
} = {}) {
  if (!scene || !camera) throw new Error('initNebula: scene and camera required');
  _camera = camera;

  if (_group) {
    scene.remove(_group);
    _group.traverse(o => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  }
  _group = new THREE.Group();
  scene.add(_group);

  _layers.length = 0;
  _time = 0;

  for (const L of layers) {
    const { depthOffset = 80, viewMult = 1.5, ...matOpts } = L || {};
    const mat = makeNebulaMaterial(matOpts);
    const layer = makeLayer({ addTo: _group, depthOffset, viewMult, material: mat });
    _layers.push(layer);
  }
}

export function updateNebula(dt = 0.016) {
  if (!_group || !_camera) return;
  _time += dt;

  const { dir } = cameraBasis(_camera);
  const { width, height } = orthoViewSize(_camera);

  for (const L of _layers) {
    const { mesh, depthOffset, viewMult, material } = L;

    // face the camera & sit in front of it along the view dir
    mesh.quaternion.copy(_camera.quaternion);
    mesh.position.copy(_camera.position).addScaledVector(dir, depthOffset);

    // cover the view with a margin
    mesh.scale.set(width * viewMult, height * viewMult, 1);

    // animate flow
    material.uniforms.uTime.value = _time;
  }
}
