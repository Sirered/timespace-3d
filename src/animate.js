import { orbitImages } from '/src/imageLoader.js';
import { updateFocus, isFocusMode } from './focusInteraction.js';
import { hasLogoPath, getPointOnLogoPath, getPathsCount } from '/src/logoPath.js';

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
          const count = Math.max(1, getPathsCount());
          const pathIdx = imgData.orbitBand % count; // wrap to available paths
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
