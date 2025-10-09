// main.js
import { setupScene } from './setupScene.js';
import { setupCamera } from './setupCamera.js';
import { setupRenderer } from './setupRenderer.js';
import { setupLights } from './setupLights.js';
import { setupResponsive } from './resizeHandler.js';
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
  const teardownResize = setupResponsive({ scene, camera, renderer: renderer, backplates });


  controls = setupControls(camera, renderer, {
    enableZoom: false,
    enablePan: false,
    lockToEquator: true,  // horizontal-only orbiting
  });

  setupLights(scene);

  const isPhone  = window.matchMedia('(max-width: 640px)').matches;
  const isTablet = window.matchMedia('(max-width: 1024px)').matches && !isPhone;

  const STAR_CFG = isPhone ? {
    // smaller, dimmer, fewer — and farther back
    count: 1400,
    viewMult: 1.15,
    depthOffsets: [35, 55, 85],
    sizeMult: 0.85,
    maxSizePx: 5,
    brightness: 0.9,
    pixelScale: 0.65, // NEW (from starfield.js)
    dprCap: 1.5,
    bigTwinkleCount: 0
  } : isTablet ? {
    count: 2600,
    viewMult: 1.30,
    depthOffsets: [25, 40, 65],
    sizeMult: 1.0,
    maxSizePx: 8,
    brightness: 1.05,
    pixelScale: 0.85,
    dprCap: 1.75,
    bigTwinkleCount: 20
  } : {
    count: 3600,
    viewMult: 1.35,
    depthOffsets: [20, 30, 50],
    sizeMult: 1.1,
    maxSizePx: 10,
    brightness: 1.1,
    pixelScale: 1.0,
    dprCap: 2.0,
    bigTwinkleCount: 40
  };

  await initStarfield(scene, {
    camera,
    mode: 'slab',
    bigSpriteDepth: -12,
    // debugNoDepth: true,
    ...STAR_CFG
  });



  // --- Content ---
  await loadImagesFromSupabase(scene);
  setupFocusInteraction({ scene, camera, renderer });


  const MOBILE_SAFE_SHRINK = 0.86; // try 0.80–0.90 if you want more/less room

  loadGLBFromURL('/TextureFixed-5.glb', scene, camera, () => {
    console.log('glb file loaded successfully');
    if (isPhone) {
      camera.zoom *= MOBILE_SAFE_SHRINK;
      camera.updateProjectionMatrix();
      // if you imported reseedStarfield, call it so the slab wraps to the new zoom:
      // await reseedStarfield(scene);
    }
  }, {
    // tighter mobile framing so the whole shape stays in view
    ...(isPhone ? {
      fillK: 0.52,        // was 0.60
      framingZoom: 0.72,  // was 0.80
      topMarginFrac: -0.05,
      pushZ: 0
    } : isTablet ? {
      fillK: 0.68,        // slightly smaller than before
      framingZoom: 0.88,
      topMarginFrac: -0.10,
      pushZ: 0
    } : {
      fillK: 0.78,        // desktop still close, but a hair more room
      framingZoom: 0.98,
      topMarginFrac: -0.15,
      pushZ: 0
    })
  });

  const composer = setupPostFX(
    renderer, scene, camera,
    isPhone
      ? { bloomStrength: 0.18, vignetteDarkness: 0.30, filmNoise: 0.02 }
      : { bloomStrength: 0.25, vignetteDarkness: 0.35, filmNoise: 0.03 }
  );




  // animate expects a callback(dt) — our updateStarfield already takes dt
  animate(scene, camera, composer, (dt) => {
    updateStarfield(dt);
  }, controls, backplates);

  introZoom(camera, controls, {
    duration: 500,
    from: 0.06, 
    to: isPhone ? 0.85 : 1.0
  });
}

init();
