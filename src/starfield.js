import * as THREE from 'three';
import { scene, loader } from './threeSetup.js';

let starField = null;

function createStarfield() {
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 5000;

  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i++) {
    positions[i] = THREE.MathUtils.randFloatSpread(300);
  }

  starGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
  );

  const sprite = loader.load('/Star2.png');

  const starMaterial = new THREE.PointsMaterial({
    map: sprite,
    color: 0xffffff,
    size: 1,
    transparent: true,
    alphaTest: 0.01,
    sizeAttenuation: true, // ensures closer stars appear larger in perspective mode
  });

  starField = new THREE.Points(starGeometry, starMaterial);
  scene.add(starField);

  return starField; // ✅ useful for animation
}

export { createStarfield, starField };
