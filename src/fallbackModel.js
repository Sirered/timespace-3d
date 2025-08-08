// fallbackModel.js
import * as THREE from 'three';

function loadFallbackModel(scene) {
  const geometry = new THREE.SphereGeometry(2, 32, 32);
  const material = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
  const model = new THREE.Mesh(geometry, material);
  model.castShadow = true;
  model.receiveShadow = true;
  scene.add(model);
}

export { loadFallbackModel };
