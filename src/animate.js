// animate.js
import * as THREE from 'three';
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
// let isHoveringMain = false;
// const BASE_ORBIT_SPEED  = 0.5;
// const HOVER_ORBIT_SPEED = 0.2;

// const raycaster = new THREE.Raycaster();
// const mouse = new THREE.Vector2();

// const onMouseMove = (e) => {
//   const rect = renderer.domElement.getBoundingClientRect();
//   mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
//   mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

//   if (!isFocusMode()) {
//     raycaster.setFromCamera(mouse, camera);
//     const intersects = raycaster.intersectObjects(
//       orbitImages.map(o => o.mesh),
//       true
//     );
//     isHoveringMain = intersects.length > 0;
//   } else {
//     isHoveringMain = false;
//   }
// };
//   renderer.domElement.addEventListener('mousemove', onMouseMove);
  let last = performance.now();

  function loop(now = performance.now()) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); // clamp to avoid huge jumps
    last = now;

    const t = now * 0.001;

    // Orbit the gallery only when not focused
    if (!isFocusMode()) {
      orbitImages.forEach((imgData, i) => {
        // const speed = isHoveringMain ? HOVER_ORBIT_SPEED : BASE_ORBIT_SPEED;
        // const angle = imgData.angle + t * speed + (i * 0.35);
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
