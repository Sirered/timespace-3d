// interaction.js
import * as THREE from 'three';
import { orbitImages } from './imageLoader.js';

function setupMouseClick(scene, camera, renderer) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  renderer.domElement.addEventListener('click', (event) => {
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(orbitImages.map(obj => obj.mesh));

    if (intersects.length > 0) {
      alert('Clicked image!');
    }
  });
}

export { setupMouseClick };
