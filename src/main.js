// main.js
import { setupScene } from './setupScene.js';
import { setupCamera } from './setupCamera.js';
import { setupRenderer } from './setupRenderer.js';
import { setupLights } from './setupLights.js';
import { resizeHandler } from './resizeHandler.js';
import { animate } from './animate.js';
import { loadGLBFromURL } from './glbLoader.js';
import { loadImagesFromSupabase } from './imageLoader.js';
import { setupFocusInteraction } from './focusInteraction.js';

// ⭐ Starfield
import { initStarfield, updateStarfield } from './starfield.js';
import { setupControls } from './setupControls.js';


let scene, camera, renderer, controls;


async function init() {
  scene    = setupScene();
  camera   = setupCamera();
  renderer = setupRenderer();

  controls = setupControls(camera, renderer, {
    enableZoom: false,
    enablePan: false,
    lockToEquator: true,  // horizontal-only orbiting
  });

  setupLights(scene);

  // main.js (snippet)
await initStarfield(scene, {
  camera,                // REQUIRED for slab mode
  mode: 'slab',          // default
  count: 5000,           // fewer points; most will be on-screen
  viewMult: 1.4,         // expand beyond viewport a bit
  depthOffsets: [20, 30, 50], // 3 layers
  bigSpriteDepth: -12,
  bigTwinkleCount: 50,
  sizeMult: 1.1,
  maxSizePx: 12,         // hard cap so none get huge
  brightness: 1.2,
  // debugNoDepth: true,
});



  // --- Content ---
  await loadImagesFromSupabase(scene);
  setupFocusInteraction({ scene, camera, renderer });
  resizeHandler(camera, renderer);

  loadGLBFromURL('/circ_color.glb', scene, camera, () => {
  console.log('circ_color.glb loaded successfully');
  }, {
    fillK:0.8,      // bigger (taller) model; try 1.6–2.0
    topMargin: -0.15 * ((camera.top - camera.bottom) / camera.zoom), // slight cushion from the top
    pushZ: 0         // usually 0 for ortho; distance doesn’t affect size
  });


  // animate expects a callback(dt) — our updateStarfield already takes dt
  animate(scene, camera, renderer, (dt) => {
    updateStarfield(dt);
  }, controls);
}

init();
