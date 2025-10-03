import * as THREE from 'three';

function setupRenderer() {
  const canvas = document.createElement('canvas');

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });

  const vw = window.visualViewport?.width  ?? window.innerWidth;
  const vh = window.visualViewport?.height ?? window.innerHeight;
  renderer.setSize(vw, vh, false);

  // Cap DPR on mobile to keep GPU cost reasonable
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  renderer.setPixelRatio(dpr);

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.physicallyCorrectLights = true;

  document.body.appendChild(renderer.domElement);
  return renderer;
}

export { setupRenderer };
