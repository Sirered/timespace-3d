// centerBackplate.js (one-time helper)
import * as THREE from 'three';

export function addBackplates(scene, camera, {
  centerTint = 0xffffff, centerOpacity = 0.15, centerSizeMult = 0.9,
  edgeOpacity = 0.18, edgeSizeMult = 1.6
} = {}) {
  const loader = new THREE.TextureLoader();
  const tex    = loader.load('/textures/softCircle.png'); // white radial, alpha→0 at edge

  const make = (color, opacity, sizeMult, order) => {
    const mat = new THREE.SpriteMaterial({
      map: tex, color, transparent: true, opacity,
      depthTest: false, depthWrite: false, blending: THREE.NormalBlending
    });
    const s   = new THREE.Sprite(mat);
    s.renderOrder = order;
    scene.add(s);
    return s;
  };

  const center = make(centerTint, centerOpacity, centerSizeMult, -500); // above stars, below photos
  const edge   = make(0x000000, edgeOpacity, edgeSizeMult,  -499);      // subtle edge dimmer

  const update = () => {
    const w = (camera.right - camera.left)  / camera.zoom;
    const h = (camera.top   - camera.bottom) / camera.zoom;
    const size = Math.max(w, h);
    center.position.copy(camera.position);
    edge.position.copy(camera.position);
    center.scale.setScalar(size * centerSizeMult);
    edge.scale.setScalar(size * edgeSizeMult);
  };

  return { update };
}
