// setupCamera.js
import * as THREE from 'three';

function setupCamera() {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const height = typeof window !== 'undefined' ? window.innerHeight : 720;
  const aspect = width / height;
  const frustumSize = 10;
  const camera = new THREE.OrthographicCamera(
    -frustumSize * aspect / 2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    -frustumSize / 2,
    0.1,
    1000
  );
  camera.position.set(-30, 0, 0);
  camera.lookAt(0, 0, 0);
  return camera;
}

export { setupCamera };
