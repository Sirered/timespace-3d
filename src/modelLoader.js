import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { scene } from './threeSetup.js';

const gltfLoader = new GLTFLoader();

function loadGLBModel(pathToGLB) {
  gltfLoader.load(
    pathToGLB,
    (gltf) => {
      const model = gltf.scene;

      // Optional: center and scale the model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center); // center at origin

      const size = box.getSize(new THREE.Vector3()).length();
      const scale = 4 / size;
      model.scale.setScalar(scale);

      scene.add(model);
    },
    undefined,
    (error) => {
      console.error('Error loading GLB model:', error);
    }
  );
}

export { loadGLBModel };
