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
import { setupPostFX } from './postfx.js';
import { addBackplates } from './centerBackplate.js';

// ⭐ Starfield
import { initStarfield, updateStarfield } from './starfield.js';
import { setupControls } from './setupControls.js';



let scene, camera, renderer, controls;

// Smooth orthographic zoom tween
function introZoom(camera, controls, {
  duration = 2000,      // ms
  from = 0.06,         // very zoomed out
  to = 1.0,            // your current view
  easing = (t) => (t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2) // easeInOutCubic
} = {}) {
  // optionally pause user input during the intro
  const prevEnabled = controls?.enabled ?? true;
  if (controls) controls.enabled = false;

  camera.zoom = from;
  camera.updateProjectionMatrix();

  const t0 = performance.now();
  function step(now) {
    const u = Math.min(1, (now - t0) / duration);
    const z = from + (to - from) * easing(u);
    camera.zoom = z;
    camera.updateProjectionMatrix();
    if (u < 1) {
      requestAnimationFrame(step);
    } else if (controls) {
      controls.enabled = prevEnabled; // hand control back to the user
    }
  }
  requestAnimationFrame(step);
}


async function init() {
  scene    = setupScene();
  camera   = setupCamera();
  renderer = setupRenderer();

  const backplates = addBackplates(scene, camera);


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
    fillK: 0.8,
    topMarginFrac: -0.15,   // -15% of view height (stable)
    pushZ: 0,
    framingZoom: 1.0        // <-- frame for the final zoom
  });

  const composer = setupPostFX(renderer, scene, camera, {
  bloomStrength: 0.25,
  vignetteDarkness: 0.35,
  filmNoise: 0.03,
});





  // animate expects a callback(dt) — our updateStarfield already takes dt
  animate(scene, camera, composer, (dt) => {
    updateStarfield(dt);
  }, controls, backplates);

  introZoom(camera, controls, {
    duration: 500,
    from: 0.06, // how far out you want to start
    to: 1.0     // your normal zoom
  });
}

init();
