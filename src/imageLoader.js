// // supabaseImageLoader.js
// import * as THREE from 'three';
// import { supabase } from './supabaseClient.js';

// const orbitImages = [];

// // (optional) tiny cache so we don’t re-request identical URLs when hot reloading
// const _texCache = new Map();

// export async function loadImagesFromSupabase(scene, { envTexture = null } = {}) {
//   const { data, error } = await supabase
//     .from('imagerecord')
//     .select('file_name, people');

//   if (error || !data) {
//     console.error('Error fetching image records:', error);
//     return;
//   }

//   const loader = new THREE.TextureLoader();

//   const getTexture = (url) =>
//     new Promise((resolve, reject) => {
//       if (_texCache.has(url)) return resolve(_texCache.get(url));
//       loader.load(
//         url,
//         (tx) => {
//           tx.colorSpace = THREE.SRGBColorSpace;      // correct color decoding
//           tx.anisotropy = 8;                          // crisper at angles
//           _texCache.set(url, tx);
//           resolve(tx);
//         },
//         undefined,
//         reject
//       );
//     });

//   // Radius for the initial orbit
//   const main_R = 4;
//   const sub_R = 3.5;
//   const SUB_Y_OFFSET = -3;

//   const SUB_X_SHIFT = 5;
//   const SUB_Y_LIFT = 1;
//   const MAIN_X_SHIFT = -1;
//   const MAIN_Y_LIFT = 1;
//   const MAIN_Z_CHANGE = 0;
//   const SUB_Z_CHANGE = 0.5;

//   for (let i = 0; i < data.length; i++) {
//     const record = data[i];
//     const url = record.file_name;

//     try {
//       const texture = await getTexture(url);

//       const aspect = texture.image.width / texture.image.height;
//       const width = aspect > 1 ? 2 : 2 * aspect;
//       const height = aspect > 1 ? 2 / aspect : 2;

//       const geometry = new THREE.PlaneGeometry(width, height);

//       // --- Option A: matte, physically lit photo (recommended) ---
//       const material = new THREE.MeshStandardMaterial({
//         map: texture,
//         roughness: 0.9,
//         metalness: 0.0,
//         transparent: true,
//         side: THREE.DoubleSide,
//       });

//       // --- Option B: glossy “photo slab” look (uncomment to try) ---
//       // const material = new THREE.MeshPhysicalMaterial({
//       //   map: texture,
//       //   roughness: 0.25,
//       //   metalness: 0.0,
//       //   clearcoat: 1.0,
//       //   clearcoatRoughness: 0.15,
//       //   envMap: envTexture || null,           // pass an env map from outside if you have one
//       //   envMapIntensity: envTexture ? 1.0 : 0,
//       //   transparent: true,
//       //   side: THREE.DoubleSide,
//       // });

//       const mesh = new THREE.Mesh(geometry, material);
//       //50% smaller
//       mesh.scale.set(0.5, 0.5, 1);
//       mesh.castShadow = false;
//       mesh.receiveShadow = false;

//       // place on a ring, add a little vertical variation
//       const angle = i; // simple       const isSub = i >= splitIndex;
//       const isSub = (i%3) === 2;
//       const orbitR = isSub ? sub_R : main_R;

//       const jitterY = (Math.random() - 0.5) * 1.5;
//       const baseY   = isSub ? SUB_Y_OFFSET : 0;

//       mesh.position.set(
//         Math.cos(angle) * orbitR,
//         baseY + jitterY,
//         Math.sin(angle) * orbitR
//       );
//       mesh.lookAt(0, 0, 0);

//       // Photos should render in front of the line-art model when overlapping
//       mesh.renderOrder = 2;

//       // Important so transparent photos don’t write to the depth buffer and punch holes
//       if ('depthWrite' in mesh.material) mesh.material.depthWrite = false;

//       scene.add(mesh);

//       orbitImages.push({
//         mesh,
//         angle,
//         band: isSub ? 'sub' : 'main',
//         orbitRadius: orbitR, // store R for each image
//         verticalOffset: baseY + jitterY,
//         offsetX: isSub ? SUB_X_SHIFT : MAIN_X_SHIFT,
//         yLift:   isSub ? SUB_Y_LIFT  : MAIN_Y_LIFT,
//         zChange: isSub ? SUB_Z_CHANGE : MAIN_Z_CHANGE,
//         record: { ...record, people: Object.keys(record.people || {}) },
//       });

//     } catch (e) {
//       console.warn('Failed to load texture:', url, e);
//     }
//   }
// }

// export { orbitImages };

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

