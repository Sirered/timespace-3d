// glbLoader.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
let model;

function loadGLBFromURL(url, scene, onLoadCallback = () => {}) {
  loader.load(
    url,
    (gltf) => {
      if (model) {
        scene.remove(model);
      }

      model = gltf.scene;

      // Center the model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);

      // Scale model to fit
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 4 / maxDim;
      model.scale.setScalar(scale);

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      scene.add(model);
      onLoadCallback();
    },
    (xhr) => {
      console.log(`Loading circ.glb: ${(xhr.loaded / xhr.total * 100).toFixed(0)}%`);
    },
    (err) => {
      console.error('Error loading circ.glb:', err);
    }
  );
}

export { loadGLBFromURL };
