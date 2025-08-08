// main.js
import { setupScene } from './setupScene.js';
import { setupCamera } from './setupCamera.js';
import { setupRenderer } from './setupRenderer.js';
import { setupLights } from './setupLights.js';
import { loadFallbackModel } from './fallbackModel.js';
import { resizeHandler } from './resizeHandler.js';
import { animate } from './animate.js';
import { loadGLBFromURL } from './glbLoader.js';
import { loadImagesFromSupabase } from './imageLoader.js';
import { setupFocusInteraction } from './focusInteraction.js';

let scene, camera, renderer;

async function init() {
  scene = setupScene();
  camera = setupCamera();
  renderer = setupRenderer();

  setupLights(scene);
  await loadImagesFromSupabase(scene);

  setupFocusInteraction({ scene, camera, renderer }); // ← add here

  resizeHandler(camera, renderer);
  loadGLBFromURL('./circ_color.glb', scene, () => {
    console.log('circ_color.glb loaded successfully');
  });
  animate(scene, camera, renderer);
}

init();
