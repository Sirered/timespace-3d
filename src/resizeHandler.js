// resizeHandler.js
import { orbitImages } from './imageLoader.js';
import { reseedStarfield } from './starfield.js';

function worldUnitsPerPixel(camera, pxW, pxH) {
  const worldW = (camera.right - camera.left) / (camera.zoom || 1);
  // Using width is fine for square sprites
  return worldW / pxW;
}

export function setupResponsive({ scene, camera, renderer, backplates=null, debounceMs=120 }) {
  let rafId = 0, timer = 0;

  const apply = () => {
    const vw = window.visualViewport?.width  ?? window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;

    // Resize renderer (no CSS scaling)
    renderer.setSize(vw, vh, false);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);

    // Update ortho frustum to maintain logical "world height"
    const aspect = vw / vh;
    const frustumSize = 10; // your base world height
    camera.left   = -frustumSize * aspect / 2;
    camera.right  =  frustumSize * aspect / 2;
    camera.top    =  frustumSize / 2;
    camera.bottom = -frustumSize / 2;
    camera.updateProjectionMatrix();

    // Convert desired on-screen px → world units, scale sprites consistently
    const wuPerPx = worldUnitsPerPixel(camera, vw, vh);
    orbitImages.forEach(({ mesh }) => {
      const basePx = mesh.userData.basePx ?? 110; // target size on phone
      const s = basePx * wuPerPx;
      mesh.scale.set(s, s, 1);
    });

    // Update background plates
    backplates?.update?.();

    // Reseed stars so density stays constant at new zoom/aspect
    reseedStarfield(scene);
  };

  const request = () => {
    cancelAnimationFrame(rafId);
    clearTimeout(timer);
    // a short debounce avoids double work on orientation changes
    timer = setTimeout(() => { rafId = requestAnimationFrame(apply); }, debounceMs);
  };

  // hook multiple sources of size change
  window.addEventListener('resize', request);
  window.visualViewport?.addEventListener('resize', request);
  window.addEventListener('orientationchange', request);

  // run once now
  apply();

  return () => {
    window.removeEventListener('resize', request);
    window.visualViewport?.removeEventListener('resize', request);
    window.removeEventListener('orientationchange', request);
    cancelAnimationFrame(rafId);
    clearTimeout(timer);
  };
}
