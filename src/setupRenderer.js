// setupRenderer.js
import * as THREE from 'three';

function setupRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Modern color pipeline
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0; // tweak 0.9–1.1

  // (optional) more physically plausible lighting falloff
  renderer.physicallyCorrectLights = true;

  document.body.appendChild(renderer.domElement);
  return renderer;
}

export { setupRenderer };

