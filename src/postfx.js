// main.js (or postfx.js)
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass }from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass }     from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { FilmPass }       from 'three/examples/jsm/postprocessing/FilmPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';

export function setupPostFX(renderer, scene, camera, opts = {}) {
  // color space / tone mapping (pick ONE approach)
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;

  const composer = new EffectComposer(renderer);

  // match device pixel ratio for sharp stars
  composer.setPixelRatio(renderer.getPixelRatio?.() ?? window.devicePixelRatio);

  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    opts.bloomStrength ?? 0.25,
    opts.bloomRadius   ?? 0.6,
    opts.bloomThreshold?? 0.95
  );
  composer.addPass(bloom);

  // If the image still feels “veiled”, try disabling vignette entirely or keep it very light:
  // (comment out these 4 lines to test without it)
  //const vignette = new ShaderPass(VignetteShader);
  //vignette.uniforms.offset.value   = opts.vignetteOffset   ?? 1.2; // slightly softer edge
  //vignette.uniforms.darkness.value = opts.vignetteDarkness ?? 0.15;
  //composer.addPass(vignette);

  // GammaCorrectionShader is optional if renderer.outputColorSpace = sRGB.
  // If things look too dim WITHOUT it, keep it; otherwise remove it.
  composer.addPass(new ShaderPass(GammaCorrectionShader));

  const film = new FilmPass(opts.filmNoise ?? 0.02, 0, opts.filmScanlines ?? 256, opts.filmGrayscale ?? false);
  film.renderToScreen = true;
  composer.addPass(film);

  const setSize = () => {
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.setPixelRatio(renderer.getPixelRatio?.() ?? window.devicePixelRatio);
  };
  setSize();
  window.addEventListener('resize', setSize);

  return composer;
}

