// supabaseImageLoader.js
import * as THREE from 'three';
import { supabase } from './supabaseClient.js';

const orbitImages = [];

export async function loadImagesFromSupabase(scene) {
  const { data, error } = await supabase
    .from('imagerecord')
    .select('file_name, people');

  if (error || !data) {
    console.error('Error fetching image records:', error);
    return;
  }

  const textureLoader = new THREE.TextureLoader();

  data.forEach((record, index) => {
    const url = record.file_name; // Already a full public URL
    textureLoader.load(url, (texture) => {
      const aspect = texture.image.width / texture.image.height;
      const width = aspect > 1 ? 2 : 2 * aspect;
      const height = aspect > 1 ? 2 / aspect : 2;

      const geometry = new THREE.PlaneGeometry(width, height);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
      });


      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        Math.cos(index) * 10,
        (Math.random() - 0.5) * 4,
        Math.sin(index) * 10
      );
      mesh.lookAt(0, 0, 0);

      scene.add(mesh);

      orbitImages.push({
        mesh,
        angle: index,
        verticalOffset: (Math.random() - 0.5) * 4,
        record
      });
    });
  });
}

export { orbitImages };
