// glbLoader.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
let model;

/**
 * Load a GLB and frame it so only the *top half* (ish) is visible
 * in an OrthographicCamera.
 *
 * @param {string} url
 * @param {THREE.Scene} scene
 * @param {THREE.OrthographicCamera} camera   // <-- pass your ortho camera
 * @param {Function} onLoadCallback
 * @param {Object} opts
 *   opts.fillK: number — how much taller than the viewport the model should be (default 1.6)
 *   opts.topMargin: number — additional downward offset in view units (default -0.1 * viewHeight)
 *   opts.pushZ: number — nudge along view dir (world units), positive pushes *away* from camera
 */
function loadGLBFromURL(
  url,
  scene,
  camera,
  onLoadCallback = () => {},
  { fillK = 1.6, topMargin = null, pushZ = 0 } = {}
) {
  loader.load(
    url,
    (gltf) => {
      if (model) scene.remove(model);

      model = gltf.scene;

      // Center the model at the origin
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);

      // Measure its unscaled size
      const size = box.getSize(new THREE.Vector3());

      // Orthographic view height in world units
      // (works even if you later change camera.zoom)
      const viewHeight = (camera.top - camera.bottom) / camera.zoom;

      // Scale so the model is taller than the viewport by a factor (fillK)
      // e.g. fillK = 1.6 means model height = 1.6 * viewHeight
      const targetWorldHeight = fillK * viewHeight;
      const s = targetWorldHeight / size.y;
      model.scale.setScalar(s);

      // With center at y=0, half-height after scaling:
      const r = (size.y * s) * 0.5;

      // Position so the top is near the top of the screen and the bottom is off-screen.
      // Center y = (viewHeight/2 - r) + margin
      const margin = topMargin ?? (-0.10 * viewHeight); // small downward nudge so top isn't touching the edge
      model.position.y = (viewHeight * 0.5) - r + margin;

      // Keep it at x ≈ 0 (origin) so your images can sit around it.
      // If you want to nudge along the camera's view direction, do it here.
      if (pushZ !== 0) {
        // get camera forward (+X in your setup), convert to offset
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);           // unit vector
        model.position.addScaledVector(dir, pushZ);
      }

      // Usual material tweaks
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          // If the GLB is unlit line art, basic/standard both work;
          // leave materials as-is unless you need special blending.
          child.renderOrder = 0; // keep behind your photos (which use renderOrder 2)
        }
      });

      scene.add(model);
      onLoadCallback(model);
    },
    (xhr) => {
      console.log(`Loading circ.glb: ${(xhr.loaded / (xhr.total || 1) * 100).toFixed(0)}%`);
    },
    (err) => {
      console.error('Error loading circ.glb:', err);
    }
  );
}

export { loadGLBFromURL };
