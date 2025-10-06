// resizeHandler.js
import { reseedStarfield } from './starfield.js';

export function setupResponsive({
  scene,
  camera,
  renderer,
  backplates = null,
  debounceMs = 120,
}) {
  let rafId = 0;
  let timer = 0;

  const apply = () => {
    const vw = window.visualViewport?.width  ?? window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;

    // 1) Resize renderer (no CSS scaling)
    renderer.setSize(vw, vh, false);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    // 2) Update ortho frustum (preserve logical world height)
    const aspect = vw / vh;
    const FRUSTUM_SIZE = 10; // keep your base world height
    camera.left   = -FRUSTUM_SIZE * aspect / 2;
    camera.right  =  FRUSTUM_SIZE * aspect / 2;
    camera.top    =  FRUSTUM_SIZE / 2;
    camera.bottom = -FRUSTUM_SIZE / 2;
    camera.updateProjectionMatrix();

    // ⚠️ DO NOT rescale sprites here.
    // imageLoader already set world-space scales (uniform per orbit),
    // and focusInteraction uses frustum-relative sizing on-the-fly.

    // 3) Backplates follow camera/frustum
    backplates?.update?.();

    // 4) Keep star density consistent
    reseedStarfield(scene);
  };

  const request = () => {
    cancelAnimationFrame(rafId);
    clearTimeout(timer);
    timer = setTimeout(() => {
      rafId = requestAnimationFrame(apply);
    }, debounceMs);
  };

  // Listen to all ways the viewport can change
  window.addEventListener('resize', request);
  window.visualViewport?.addEventListener('resize', request);
  window.addEventListener('orientationchange', request);

  // Run once at startup
  apply();

  // Cleanup
  return () => {
    window.removeEventListener('resize', request);
    window.visualViewport?.removeEventListener('resize', request);
    window.removeEventListener('orientationchange', request);
    cancelAnimationFrame(rafId);
    clearTimeout(timer);
  };
}
