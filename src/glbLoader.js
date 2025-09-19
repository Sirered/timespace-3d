// // glbLoader.js
// import * as THREE from 'three';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// const loader = new GLTFLoader();
// let model;

// function loadGLBFromURL(
//   url,
//   scene,
//   camera,
//   onLoadCallback = () => {},
//   {
//     fillK = 1.6,
//     topMargin = null,         // absolute world-units margin (kept for backward compat)
//     topMarginFrac = -0.10,    // fraction of view height (recommended)
//     pushZ = 0,
//     framingZoom = null        // <-- NEW: use this zoom to frame (e.g. 1.0)
//   } = {}
// ) {
//   loader.load(
//     url,
//     (gltf) => {
//       if (model) scene.remove(model);
//       model = gltf.scene;

//       // Center the raw model
//       const box = new THREE.Box3().setFromObject(model);
//       const center = box.getCenter(new THREE.Vector3());
//       model.position.sub(center);

//       const size = box.getSize(new THREE.Vector3());

//       // Use the provided framing zoom (target/final zoom) for layout,
//       // not the camera's current zoom which may be mid-tween.
//       const useZoom = framingZoom ?? camera.zoom;
//       const viewHeight = (camera.top - camera.bottom) / useZoom;

//       // Scale to desired screen fill
//       const targetWorldHeight = fillK * viewHeight;
//       const s = targetWorldHeight / size.y;
//       model.scale.setScalar(s);

//       // Vertical placement
//       const r = (size.y * s) * 0.5;
//       const marginWorld = (topMargin != null)
//         ? topMargin
//         : (topMarginFrac * viewHeight);   // recommended path
//       model.position.y = (viewHeight * 0.5) - r + marginWorld;

//       // Optional push along camera’s forward
//       if (pushZ !== 0) {
//         const dir = new THREE.Vector3();
//         camera.getWorldDirection(dir);
//         model.position.addScaledVector(dir, pushZ);
//       }

//       model.traverse((child) => {
//         if (child.isMesh) {
//           child.castShadow = true;
//           child.receiveShadow = true;
//           child.renderOrder = 0;
//         }
//       });

//       scene.add(model);
//       onLoadCallback(model);
//     },
//     (xhr) => console.log(`Loading ${url}: ${((xhr.loaded / (xhr.total || 1)) * 100).toFixed(0)}%`),
//     (err) => console.error('Error loading GLB:', err)
//   );
// }

// export { loadGLBFromURL };

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { setLogoFixedPathsFromModel } from '/src/logoPath.js';

const loader = new GLTFLoader();
let model;

/**
 * Load a GLB and frame it 
 */
function loadGLBFromURL(url, scene, camera, onLoadCallback = () => {}, opts = {}) {
  loader.load(
    url,
    (gltf) => {
      model = gltf.scene;

      model.scale.set(5, 5, 5);
      scene.add(model);

      try {
        setLogoFixedPathsFromModel(model,scene);
      } catch (e) {
        console.warn('logo gap path build failed', e);
      }

      onLoadCallback(model);
    },
    (xhr) => {
      console.log(`Loading ${url}: ${(xhr.loaded / (xhr.total || 1) * 100).toFixed(0)}%`);
    },
    (err) => {
      console.error(`Error loading ${url}:`, err);
    }
  );
}

export { loadGLBFromURL };
