// setupCamera.js
import * as THREE from 'three';

function setupCamera() {
  const aspect = window.innerWidth / window.innerHeight;
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
