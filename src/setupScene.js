import * as THREE from 'three';

function setupScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0f13); // deep space
  return scene;
}

export { setupScene };
