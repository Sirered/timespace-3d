// glbLoader.js
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
