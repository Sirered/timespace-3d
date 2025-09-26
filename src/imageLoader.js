// imageLoader.js
import * as THREE from 'three';
import { supabase } from './supabaseClient.js';

const orbitImages = [];
const _texCache = new Map();

/**
 * Load images from Supabase:
 * - Distribute them across two orbits with a 1:2 ratio (orbit 0 : orbit 1)
 * - Assign evenly spaced phases per orbit so images maintain fixed spacing
 */
export async function loadImagesFromSupabase(scene) {
  const { data, error } = await supabase
    .from('imagerecord')
    .select('file_name, people');

  if (error || !data) {
    console.error('Error fetching image records:', error);
    return;
  }

  const pattern = [0, 1, 1]; // orbit assignment pattern → 1:2 ratio
  let loadedCount = 0;       // only increment on successful load

  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    try {
      const file = record.file_name;
      const url = file; // file_name already contains a full URL

      // load or reuse texture
      let texture = _texCache.get(url);
      if (!texture) {
        texture = await new Promise((resolve, reject) => {
          const loader = new THREE.TextureLoader();
          loader.load(url, resolve, undefined, reject);
        });
        texture.colorSpace = THREE.SRGBColorSpace;
        _texCache.set(url, texture);
      }

      // use Sprite for simplicity
      const material = new THREE.SpriteMaterial({
        map: texture,
        depthTest: false,
        depthWrite: false,
        transparent: true,
      });
      const mesh = new THREE.Sprite(material);
      mesh.scale.set(1, 1, 1.0);
      mesh.renderOrder = 10;

      scene.add(mesh);

      // Assign orbit according to [0,1,1] pattern (ratio 1:2)
      const band = pattern[loadedCount % pattern.length];
      loadedCount++;

      orbitImages.push({
        mesh,
        // legacy fields (in case orbit path is missing, fallback to circular ring)
        angle: Math.PI * 3,
        orbitRadius: 5,
        verticalOffset: 0,

        // orbit motion modifiers
        offsetX: -.5,
        yLift: 0,
        zChange: 0,

        record: { ...record, people: Object.keys(record.people || {}) },

        // animation parameters
        phase: Math.random(), // will be reassigned later
        speed: 0.3+Math.random()*0.4,

        // orbit index: 0 → first orbit, 1 → second orbit
        orbitBand: band,
      });
    } catch (e) {
      console.warn('Failed to load texture:', record.file_name, e);
      // note: loadedCount is not incremented on failure → ratio stays stable
    }
  }

  console.log('[images] orbitImages count:', orbitImages.length);

  // ====== evenly distribute images along each orbit ======
  const groups = [[], []];
  for (const img of orbitImages) {
    const b = img.orbitBand === 1 ? 1 : 0; // ensure only 0/1 bands
    groups[b].push(img);
  }

  // // Assign phases 0, 1/n, 2/n ... evenly spaced
  // groups.forEach((arr, bandIdx) => {
  //   const n = arr.length;
  //   if (n <= 0) return;
  //   arr.forEach((img, idx) => {
  //     img.phase = idx / n;
  //   });
  //   console.log(`[images] orbit ${bandIdx}: count=${n}, phase spacing=1/${n}`);
  // });
}

export { orbitImages };

