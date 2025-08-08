// setupLights.js
import * as THREE from 'three';

function setupLights(scene) {
  // Lower ambient so photos aren’t washed out
  const ambient = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambient);

  // Key light
  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(-5, 6, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  // Fill light (softer, opposite quadrant)
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(6, -2, -4);
  scene.add(fill);

  // Rim/Back light to pop the GLB silhouette
  const rim = new THREE.DirectionalLight(0xffffff, 0.7);
  rim.position.set(0, 3, -7);
  scene.add(rim);

  // Optional: very soft sky/ground tint
  const hemi = new THREE.HemisphereLight(0xddeeff, 0x111122, 0.25);
  scene.add(hemi);
}

export { setupLights };
