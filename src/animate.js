// // animate.js
// import * as THREE from 'three';
// import { orbitImages } from './imageLoader.js';
// import { updateFocus, isFocusMode } from './focusInteraction.js';

// /**
//  * Main animation loop
//  *
//  * @param {THREE.Scene} scene
//  * @param {THREE.Camera} camera
//  * @param {THREE.WebGLRenderer|import('three/examples/jsm/postprocessing/EffectComposer').EffectComposer} rendererOrComposer
//  * @param {Function} updateFn - per-frame updater (e.g., starfield)
//  * @param {OrbitControls} controls
//  */
// export function animate(scene, camera, rendererOrComposer, updateFn = () => {}, controls = null, backplates = null) {
//   let last = performance.now();
//   let orbitTime = 0;                 // <— new, paused while focused

//   function loop(now = performance.now()) {
//     requestAnimationFrame(loop);
//     const dt = Math.min(0.05, (now - last) / 1000);
//     last = now;

//     // advance the “orbit clock” only when not focused
//     const focused = isFocusMode();
//     if (!focused) orbitTime += dt;   // <— this is the only time base we use

//     // Orbit the gallery only when not focused
//     if (!focused) {
//       orbitImages.forEach((imgData, i) => {
//         const angle  = imgData.angle + orbitTime * 0.5 + (i * 0.35);
//         const orbitR = imgData.orbitRadius ?? 10;

//         const rawX = Math.cos(angle) * orbitR;
//         const rawZ = Math.sin(angle) * orbitR;
//         const rawY = Math.sin(angle) * orbitR * 0.5;

//         const y = rawY + imgData.verticalOffset + Math.sin(orbitTime + i) * 0.4;

//         imgData.mesh.position.set(rawX, y, rawZ);
//         imgData.mesh.lookAt(camera.position);
//       });
//     }

//     updateFocus(now);
//     updateFn(dt);
//     controls?.update?.();
//     backplates.update();

//     const isComposer = !rendererOrComposer?.isWebGLRenderer;
//     if (isComposer) rendererOrComposer.render();
//     else rendererOrComposer.render(scene, camera);
//   }

//   loop();
// }

import { orbitImages } from '/src/imageLoader.js';
import { updateFocus, isFocusMode } from './focusInteraction.js';
import { hasLogoPath, getPointOnLogoPath } from '/src/logoPath.js';

export function animate(scene, camera, renderer, updateStarfield = () => {}, controls = null) {
  console.log('[animate] orbitImages at start:', orbitImages.length);
  let last = performance.now();
  let logged = false;

  function loop() {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    const t = now * 0.001;

    if (!isFocusMode()) {
      if (!logged) {
        console.log('[animate] orbitImages:', orbitImages.length);
        logged = true;
      }

      orbitImages.forEach((imgData, i) => {
        const angle = imgData.angle + t * 0.5 + (i * 0.35);
        const orbitR = imgData.orbitRadius ?? 10;

        if (hasLogoPath()) {
          const tParam = (now * 0.00005 * (imgData.speed ?? 0.15) + (imgData.phase ?? i / orbitImages.length)) % 1;
          const pathIdx = (imgData.orbitBand % 2); // enforce only 0 or 1
          const p = getPointOnLogoPath(tParam, {
            pathIndex: pathIdx,
            xOffset: (imgData.offsetX ?? -2.0),
          });
          if (p) {
            p.y += (imgData.yLift ?? 0) + Math.sin(t + i) * 0.3;
            p.z += (imgData.zChange ?? 0);
            imgData.mesh.position.copy(p);
          }
        } else {
          // fallback: old circular orbit
          const rawX = Math.cos(angle) * orbitR;
          const rawZ = Math.sin(angle) * orbitR;
          const rawY = Math.sin(angle) * orbitR * 0.5;
          const y = rawY + imgData.verticalOffset + Math.sin(t + i) * 0.5;
          imgData.mesh.position.set(rawX, y, rawZ);
        }

        imgData.mesh.lookAt(camera.position);
      });
    }

    updateFocus(now);
    updateStarfield(dt);
    controls?.update();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  loop();
}
