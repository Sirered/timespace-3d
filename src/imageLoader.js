// supabaseImageLoader.js
import * as THREE from 'three';
import { supabase } from './supabaseClient.js';

const orbitImages = [];

// (optional) tiny cache so we don’t re-request identical URLs when hot reloading
const _texCache = new Map();

export async function loadImagesFromSupabase(scene, { envTexture = null } = {}) {
  const { data, error } = await supabase
    .from('imagerecord')
    .select('file_name, people');

  if (error || !data) {
    console.error('Error fetching image records:', error);
    return;
  }

  const loader = new THREE.TextureLoader();

  const getTexture = (url) =>
    new Promise((resolve, reject) => {
      if (_texCache.has(url)) return resolve(_texCache.get(url));
      loader.load(
        url,
        (tx) => {
          tx.colorSpace = THREE.SRGBColorSpace;      // correct color decoding
          tx.anisotropy = 8;                          // crisper at angles
          _texCache.set(url, tx);
          resolve(tx);
        },
        undefined,
        reject
      );
    });

  // Radius for the initial orbit
  const R = 4;

  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    const url = record.file_name;

    try {
      const texture = await getTexture(url);

      const aspect = texture.image.width / texture.image.height;
      const width = aspect > 1 ? 2 : 2 * aspect;
      const height = aspect > 1 ? 2 / aspect : 2;

      const geometry = new THREE.PlaneGeometry(width, height);

      // --- Option A: matte, physically lit photo (recommended) ---
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        side: THREE.DoubleSide,
      });

      // --- Option B: glossy “photo slab” look (uncomment to try) ---
      // const material = new THREE.MeshPhysicalMaterial({
      //   map: texture,
      //   roughness: 0.25,
      //   metalness: 0.0,
      //   clearcoat: 1.0,
      //   clearcoatRoughness: 0.15,
      //   envMap: envTexture || null,           // pass an env map from outside if you have one
      //   envMapIntensity: envTexture ? 1.0 : 0,
      //   transparent: true,
      //   side: THREE.DoubleSide,
      // });

      const mesh = new THREE.Mesh(geometry, material);
      //50% smaller
      mesh.scale.set(0.5, 0.5, 1);
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      // place on a ring, add a little vertical variation
      const angle = i; // simple stagger
      mesh.position.set(
        Math.cos(angle) * R,
        (Math.random() - 0.5) * 3,
        Math.sin(angle) * R
      );
      mesh.lookAt(0, 0, 0);

      // Photos should render in front of the line-art model when overlapping
      mesh.renderOrder = 2;

      // Important so transparent photos don’t write to the depth buffer and punch holes
      if ('depthWrite' in mesh.material) mesh.material.depthWrite = false;

      scene.add(mesh);

      orbitImages.push({
        mesh,
        angle,
        orbitRadius: R, // store R for each image
        verticalOffset: (Math.random() - 0.5) * 4,
        record: { ...record, people: Object.keys(record.people || {}) },
      });

    } catch (e) {
      console.warn('Failed to load texture:', url, e);
    }
  }
}

export { orbitImages };
