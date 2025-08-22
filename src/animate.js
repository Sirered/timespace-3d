// animate.js
import { orbitImages } from './imageLoader.js';
import { updateFocus, isFocusMode } from './focusInteraction.js';

/**
 * Main animation loop
 *
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {THREE.Renderer} renderer
 * @param {Function} updateStarfield - optional starfield updater
 * @param {OrbitControls} controls - optional OrbitControls
 */
export function animate(scene, camera, renderer, updateStarfield = () => {}, controls = null) {
  let last = performance.now();

  function loop(now = performance.now()) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); // clamp to avoid huge jumps
    last = now;

    const t = now * 0.001;

    // Orbit the gallery only when not focused
    if (!isFocusMode()) {
      orbitImages.forEach((imgData, i) => {
        const angle = imgData.angle + t * 0.5 + (i * 0.35);
        const orbitR = imgData.orbitRadius ?? 10;

        // Tilt the orbit ring diagonally in the Y-Z plane
        const rawX = Math.cos(angle) * orbitR;
        const rawZ = Math.sin(angle) * orbitR;
        const rawY = Math.sin(angle) * orbitR * 0.5;

        const y = rawY + imgData.verticalOffset + Math.sin(t + i) * 0.4;

        imgData.mesh.position.set(rawX, y, rawZ);

        // Orient image toward center model (adjust if model offset)
      imgData.mesh.lookAt(camera.position);
      });
    }

    updateFocus(now);
    updateStarfield(dt); 

    controls?.update(); // optional: update orbit controls

    renderer.render(scene, camera);
  }

  loop();
}
