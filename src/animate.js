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

      orbitImages.forEach((imgData) => {
        const { mesh } = imgData;
        if (!mesh?.visible) return;               // <- skip hidden items

        if (hasLogoPath()) {
          // deterministic motion: fixed per-orbit speed + equal phase spacing
          const speed  = imgData.speed ?? 0.6;    // set in loader (SPEED_TOP/BOTTOM)
          const phase  = imgData.phase ?? 0;      // set in loader: i / n
          const tParam = (now * 0.00005 * speed + phase) % 1;

          const count   = Math.max(1, getPathsCount());
          const pathIdx = imgData.orbitBand % count;

          const p = getPointOnLogoPath(tParam, {
            pathIndex: pathIdx,
            xOffset:   imgData.offsetX ?? -2.0,
          });

          if (p) {
            // gentle secondary motion
            p.y += (imgData.yLift ?? 0) + Math.sin(t + phase * 10.0) * 0.3;
            p.z += (imgData.zChange ?? 0);
            mesh.position.copy(p);
          }
        } else {
          // Fallback circle if paths missing
          const a = (imgData.phase ?? 0) * Math.PI * 2 + t * (imgData.speed ?? 0.6);
          const r = imgData.orbitRadius ?? 10;
          const x = Math.cos(a) * r;
          const z = Math.sin(a) * r;
          const y = Math.sin(a) * (r * 0.5) + (imgData.verticalOffset ?? 0);
          mesh.position.set(x, y, z);
        }

        mesh.lookAt(camera.position);
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
