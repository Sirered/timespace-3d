// setupScene.js
import * as THREE from 'three';

function setupScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff); // White background
  return scene;
}

export { setupScene };
