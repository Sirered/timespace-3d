// import * as THREE from 'three';

// let _paths = [];
// let _debugLines = [];

// /** Check if orbit at index exists */
// export function hasLogoPath(index = 0) {
//   return !!_paths[index];
// }

// /** Return the number of orbits */
// export function getPathsCount() {
//   return _paths.length;
// }

// /** Get a point on the orbit */
// export function getPointOnLogoPath(t, { pathIndex = 0, xOffset = 0 } = {}) {
//   const curve = _paths[pathIndex];
//   if (!curve) return null;
//   const p = curve.getPointAt((t % 1 + 1) % 1);
//   return new THREE.Vector3(p.x + xOffset, p.y, p.z);
// }

// /**
//  * Generate two fixed orbits: boundaries of the 3rd and 5th meshes
//  * (counted from top to bottom).
//  * Apply smoothing to make them silky smooth.
//  */
// export function setLogoFixedPathsFromModel(model, scene = null) {
//   _paths = [];

//   // Clear old debug lines
//   if (scene && _debugLines.length > 0) {
//     _debugLines.forEach(line => scene.remove(line));
//     _debugLines = [];
//   }

//   // Collect meshes
//   const meshes = [];
//   model.traverse(obj => {
//     if (obj.isMesh && obj.geometry && obj.geometry.attributes?.position) {
//       obj.updateWorldMatrix(true, true);
//       const box = new THREE.Box3().setFromObject(obj);
//       const center = new THREE.Vector3();
//       box.getCenter(center);
//       meshes.push({ obj, centerY: center.y });
//     }
//   });

//   if (meshes.length < 5) {
//     console.warn('[logoPath] mesh less than 5:', meshes.length);
//     return;
//   }
//   console.log('[logoPath] toall meshs:', meshes.length)

//   // Sort by Y from top to bottom
//   meshes.sort((a, b) => b.centerY - a.centerY);

//   // Only take the 3rd and 5th
//   const pickIndices = [2, 5];
//   const selected = pickIndices.map(idx => meshes[idx]).filter(Boolean);

//   selected.forEach((m) => {
//     const curve = _buildSmoothCurveFromMesh(m.obj);
//     if (curve) _paths.push(curve);

//     // Debug visualization (green lines)
//     if (scene && curve) {
//       const pts = curve.getPoints(600);
//       const geo = new THREE.BufferGeometry().setFromPoints(pts);
//       const mat = new THREE.LineBasicMaterial({ color: 0x0ff00 });
//       const line = new THREE.Line(geo,mat);
//       scene.add(line);
//       _debugLines.push(line);
//     }
//   });

//   console.log('[logoPath] created 2 smoothed orbits:', _paths.length);
// }

// /**
//  * Build a smoothed CatmullRom curve from mesh points
//  */
// function _buildSmoothCurveFromMesh(mesh) {
//   const geom = mesh.geometry;
//   const pos = geom.getAttribute('position');
//   if (!pos) return null;

//   // World-space vertices
//   const pts = [];
//   const v = new THREE.Vector3();
//   for (let i = 0; i < pos.count; i++) {
//     v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mesh.matrixWorld);
//     pts.push(v.clone());
//   }
//   if (pts.length < 8) return null;

//   // Smooth points (moving average)
//   const smoothed = _smoothPoints(pts, 12);

//   // Build closed curve with low tension
//   return new THREE.CatmullRomCurve3(smoothed, true, 'catmullrom', 0.05);
// }

// /** Moving average smoothing */
// function _smoothPoints(points, window = 10) {
//   const n = points.length;
//   if (n < window) return points;

//   const result = [];
//   const half = Math.floor(window / 2);

//   for (let i = 0; i < n; i++) {
//     const acc = new THREE.Vector3();
//     let cnt = 0;
//     for (let k = -half; k <= half; k++) {
//       const j = (i + k + n) % n; // wrap around
//       acc.add(points[j]);
//       cnt++;
//     }
//     result.push(acc.multiplyScalar(1 / cnt));
//   }

//   return result;
// }


import * as THREE from 'three';

let _paths = [];
let _debugLines = [];

/** Check if orbit at index exists */
export function hasLogoPath(index = 0) {
  return !!_paths[index];
}

/** Return the number of orbits */
export function getPathsCount() {
  return _paths.length;
}

/** Get a point on the orbit (arc-length parametrized) */
export function getPointOnLogoPath(t, { pathIndex = 0, xOffset = 0 } = {}) {
  const curve = _paths[pathIndex];
  if (!curve) return null;
  const u = (t % 1 + 1) % 1; // clamp 0..1
  const p = curve.getPointAt(u); // arc-length uniform
  return new THREE.Vector3(p.x + xOffset, p.y, p.z);
}

/**
 * Generate two fixed orbits: boundaries of the 3rd and 5th meshes
 * (counted from top to bottom). Apply smoothing to make them silky smooth.
 */
export function setLogoFixedPathsFromModel(model, scene = null) {
  _paths = [];

  // Clear old debug lines
  if (scene && _debugLines.length > 0) {
    _debugLines.forEach(line => scene.remove(line));
    _debugLines = [];
  }

  // Collect meshes
  const meshes = [];
  model.traverse(obj => {
    if (obj.isMesh && obj.geometry && obj.geometry.attributes?.position) {
      obj.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(obj);
      const center = new THREE.Vector3();
      box.getCenter(center);
      meshes.push({ obj, centerY: center.y });
    }
  });

  if (meshes.length < 5) {
    console.warn('[logoPath] mesh less than 5:', meshes.length);
    return;
  }
  console.log('[logoPath] toall meshs:', meshes.length);

  // Sort by Y from top to bottom
  meshes.sort((a, b) => b.centerY - a.centerY);

  // Only take the 3rd and 5th
  const pickIndices = [2, 4];
  const selected = pickIndices.map(idx => meshes[idx]).filter(Boolean);

  selected.forEach((m, idx) => {
    const curve = _buildSmoothCurveFromMesh(m.obj);
    if (!curve) return;

    // enforce closed & high-precision arc-length table
    curve.closed = true;
    curve.arcLengthDivisions = 2000;
    curve.getLengths(curve.arcLengthDivisions); // warm up

    _paths.push(curve);

    // // Debug visualization (thin line)
    // if (scene) {
    //   const pts = curve.getPoints(800);
    //   const geo = new THREE.BufferGeometry().setFromPoints(pts);
    //   const mat = new THREE.LineBasicMaterial({
    //     color: idx === 0 ? 0xff4157 : 0x3aa0d8,
    //     transparent: true,
    //     opacity: 0.35,
    //     linewidth: 1
    //   });
    //   const line = new THREE.Line(geo, mat);
    //   scene.add(line);
    //   _debugLines.push(line);
    // }
  });

  console.log('[logoPath] created 2 smoothed orbits:', _paths.length);
}

/** Build a smoothed CatmullRom curve from mesh points */
function _buildSmoothCurveFromMesh(mesh) {
  const geom = mesh.geometry;
  const pos = geom.getAttribute('position');
  if (!pos) return null;

  // World-space vertices
  const pts = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mesh.matrixWorld);
    pts.push(v.clone());
  }
  if (pts.length < 8) return null;

  // Moving-average smoothing
  const smoothed = _smoothPoints(pts, 12);

  // Use centripetal to reduce loops/overshoot; low tension
  return new THREE.CatmullRomCurve3(smoothed, true, 'centripetal', 0.05);
}

/** Moving average smoothing */
function _smoothPoints(points, window = 10) {
  const n = points.length;
  if (n < window) return points;

  const result = [];
  const half = Math.floor(window / 2);

  for (let i = 0; i < n; i++) {
    const acc = new THREE.Vector3();
    let cnt = 0;
    for (let k = -half; k <= half; k++) {
      const j = (i + k + n) % n; // wrap around
      acc.add(points[j]);
      cnt++;
    }
    result.push(acc.multiplyScalar(1 / cnt));
  }

  return result;
}
