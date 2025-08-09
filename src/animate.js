// animate.js
import { orbitImages } from './imageLoader.js';
import { updateFocus, isFocusMode } from './focusInteraction.js';

export function animate(scene, camera, renderer, updateStarfield = () => {}) {
  let last = performance.now();

  function loop(now = performance.now()) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); // clamp to avoid huge jumps
    last = now;

    // Orbit the gallery only when not focused
    if (!isFocusMode()) {
      const t = now * 0.001;
      orbitImages.forEach((imgData, i) => {
        const angle = imgData.angle + t * 0.5 + (i * 0.35);
        const x = Math.cos(angle) * 10;
        const z = Math.sin(angle) * 10;
        const y = imgData.verticalOffset + Math.sin(t + i) * 0.4;
        imgData.mesh.position.set(x, y, z);
        imgData.mesh.lookAt(0, 0, 0);
      });
    }

    // focus interaction tweens + ring motion
    updateFocus(now);

    // ⭐ animate starfield shells
    updateStarfield(dt);

    renderer.render(scene, camera);
  }

  loop();
}
