// setupControls.js
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Creates OrbitControls for the given camera and renderer.
 * Works with OrthographicCamera.
 *
 * @param {THREE.Camera} camera - Your THREE.OrthographicCamera
 * @param {THREE.Renderer} renderer - Your WebGLRenderer
 * @param {Object} [options] - Optional controls configuration
 * @returns {OrbitControls}
 */
export function setupControls(camera, renderer, options = {}) {
  const controls = new OrbitControls(camera, renderer.domElement);

  // Damping for smooth motion
  controls.enableDamping = true;
  controls.dampingFactor = options.dampingFactor ?? 0.1;

  // Disable zoom/pan if not needed
  controls.enableZoom = options.enableZoom ?? false;
  controls.enablePan = options.enablePan ?? false;

  // Restrict vertical orbit angle if desired
  if (options.lockToEquator) {
    const angle = Math.PI / 2;
    controls.minPolarAngle = angle;
    controls.maxPolarAngle = angle;
  }

  // Limit zoom (if enabled)
  if (controls.enableZoom) {
    controls.minZoom = options.minZoom ?? 0.5;
    controls.maxZoom = options.maxZoom ?? 3.0;
  }

  return controls;
}
