// animate.js
import { orbitImages } from './imageLoader.js';
import { isFocusMode, updateFocus } from './focusInteraction.js';

function animate(scene, camera, renderer) {
  function loop(time) {
    requestAnimationFrame(loop);

    if (!isFocusMode()) {
      const t = Date.now() * 0.001;
      orbitImages.forEach((imgData, i) => {
        const angle = imgData.angle + t + (i * 0.5);
        const x = Math.cos(angle) * 10;
        const z = Math.sin(angle) * 10;
        const y = imgData.verticalOffset + Math.sin(t + i) * 0.5;
        imgData.mesh.position.set(x, y, z);
        imgData.mesh.lookAt(0, 0, 0);
      });
    }

    updateFocus(time || performance.now()); // run tweens
    renderer.render(scene, camera);
  }

  loop();
}

export { animate };
