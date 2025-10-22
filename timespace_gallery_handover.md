# TIMELab / TIMESpace 3D Gallery Documentation

This project is a 3D infinite-orbiting gallery designed to showcase images (from Supabase) alongside a GLB model. It provides an immersive space-like environment with animated starfields, orbiting images, and interactive focus features.

> **Stack highlights**
> - **Three.js** for rendering (orthographic camera).
> - **Supabase** for storage/table access (can be swapped—see “Using a different backend”).
> - **Vite** (or any ES-module bundler). Env vars are read via `import.meta.env`.

---

## Overview

The gallery combines several modular components:

- **Scene setup**: Initializes Three.js rendering, camera, and lights.
- **Starfield background**: Procedurally generated star layers that orbit relative to the camera.
- **Image loader**: Fetches image records from Supabase and places them on orbiting paths around the GLB model.
- **Focus interaction**: Clicking an image centers it, pauses orbiting, and then releases it back smoothly.
- **Post-processing**: Bloom, vignette, and film grain effects for a cinematic presentation.

---

## Setup and Environment

### Dependencies

Install dependencies:

```bash
npm install three @supabase/supabase-js
```

Example imports:

```js
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader }  from 'three/examples/jsm/loaders/GLTFLoader.js';
```

### Required environment (.env.local)

This implementation **uses Supabase**. Create a `.env.local` in the project root (Vite will load this; do **not** commit it). Please refer to .env.eample:

```bash
# .env.local
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_PUBLIC_SUPABASE_BUCKET=your-bucket-name
```

- **Where to find URL & anon key**: Supabase Dashboard → **Connect → App Framework**.  
  Use the **anon (public) key**.
- **`VITE_PUBLIC_SUPABASE_BUCKET`**: the **Storage bucket** that contains your images (e.g., `timelab-gallery`).  
- Vite only exposes variables prefixed with `VITE_`. Access them via `import.meta.env.*`.
- After changing env vars, **restart** your dev server.

### Supabase schema expectations

The project reads from a Supabase table named **`imagerecord`**. Please refer to **imagerecord.schema.sql** for reference:

- `file_name` *(text)* – **full public URL** to the image (e.g., a public bucket URL).
- `people` *(JSONB)* – metadata for filtering/grouping (populated by the ML pipeline).

The Supabase client is created in `supabaseClient.js`.

> If you plan to switch away from Supabase, see **“Using a different backend”**.

---

## Project Structure

```
src/
├── main.js                 # Entry point, initializes scene, camera, renderer, controls
├── setupScene.js           # Configures base Three.js scene
├── setupCamera.js          # Orthographic camera setup
├── setupRenderer.js        # Renderer initialization with color settings
├── setupLights.js          # Ambient, key, fill, rim, hemisphere lights
├── starfield.js            # Generates and updates the star background
├── imageLoader.js          # Loads images from Supabase, maps textures to sprites, orbits them
├── focusInteraction.js     # Click-to-focus / release interactions
├── animate.js              # Main animation loop, orbit updates, rendering
├── glbLoader.js            # Loads and frames GLB models
├── resizeHandler.js        # Adjusts renderer and camera on resize
├── postfx.js               # Bloom, vignette, film grain
├── supabaseClient.js       # Supabase client (swap this to change backends)
├── logoPath.js             # Builds two smoothed closed orbits and exposes arc-length sampling
```
---

## Key Components

### `main.js`
1. Creates scene, camera, renderer, and controls.
2. Adds starfield and lights.
3. Loads Supabase images and a GLB model.
4. Sets up post-processing.
5. Runs the animation loop (`animate.js`).
6. Plays an intro zoom.

### `starfield.js`
Generates stars in layered “slabs” that twinkle and parallax with camera motion.

### `imageLoader.js`
Fetches images from Supabase and maps them as **Sprites** that orbit the 3D model.  

### `focusInteraction.js`
- Click an image → it animates the clicked image to the center and orbiting pauses.
- Release → image returns to its orbit position.

### `animate.js`
Drives the render loop, starfield updates, orbit positions, focus states, and EffectComposer pass when enabled.

### `postfx.js`
- **UnrealBloomPass** – subtle glow
- **Vignette** – edge darkening
- **FilmPass** – light grain

### `setupLights.js`
Balanced lighting: ambient + directional key/fill/rim + hemisphere.

### `logoPath.js`

**Purpose**  
Build **two smoothed, closed orbits** from the loaded GLB and provide **arc-length–uniform sampling** along these paths for constant-speed animation. The module also supports a small local **x-offset** to separate layers/parallax. :contentReference[oaicite:4]{index=4}

**How it works**  
- Traverses all meshes in the GLB, computes each mesh’s **world-space bounding-box center Y**, then sorts meshes **top → bottom**.  
- **Selects the 3rd and 5th meshes** by this vertical order to form two orbits (design choice).  
- Extracts world-space vertex positions, applies a **moving-average smoothing (window=12)**, and builds **centripetal Catmull–Rom** closed curves with **tension=0.05**.  
- Increases `arcLengthDivisions` to **2000** and precomputes lengths to stabilize `getPointAt` speed.  
- If fewer than **5** meshes exist, the builder logs a warning and skips.  
- Optional debug line rendering is present but commented out in the source. :contentReference[oaicite:5]{index=5}

**Public API**
```ts
hasLogoPath(index?: number): boolean
getPathsCount(): number
getPointOnLogoPath(
  t: number,
  opts?: { pathIndex?: 0 | 1; xOffset?: number }
): THREE.Vector3 | null
setLogoFixedPathsFromModel(
  model: THREE.Object3D,
  scene?: THREE.Scene
): void

---

## Configuration Options

### Environment (required)
Set in `.env.local`:

- `VITE_SUPABASE_URL` – Supabase project URL (**Connect → App Framework**).
- `VITE_SUPABASE_ANON_KEY` – public client key (**Connect → App Framework**).
- `VITE_PUBLIC_SUPABASE_BUCKET` – Storage bucket holding image assets.

### Starfield (`initStarfield`)
- `count` – total stars  
- `depthOffsets` – z-offsets for each star layer  
- `brightness`, `sizeMult`, `maxSizePx` – visual tuning  
- `viewMult`, `bigSpriteDepth`, `bigTwinkleCount` – parallax & accent stars

### Image Loader
- Material can be `SpriteMaterial` (default) using SRGB textures.
- Per-orbit uniform **world height**, configurable **orbit radius**, **speed**, and **visible count**.
- Large images can use face-centered cover crops; smaller images keep original pixels.
- **Reshuffle** interval to swap which sprites are visible per band.

### Focus Interaction
- Transition durations and easing functions are adjustable.

### PostFX (`setupPostFX`)
- Bloom strength, vignette darkness, and film grain noise are tunable.

---

## Usage

### 1) Install & run

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

> The gallery renders full-screen in your browser.

### 2) Create `.env.local`

Add the three variables:

```bash
cp .env.example .env.local
# edit .env.local and set:
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_PUBLIC_SUPABASE_BUCKET
```

Restart `npm run dev` after changes.

### 3) Swap the GLB model (optional)

- Put your new `.glb` into the **`public/`** folder.  
- Update the loader call in `main.js`:

```ts
// before
loadGLBFromURL('/TextureFixed-5.glb', scene, camera, () => {

// after (example)
loadGLBFromURL('/MyScene.glb', scene, camera, () => {
```
The path is relative to `/public`, so `/MyScene.glb` becomes `public/MyScene.glb`.

### 4) Using Supabase (default)

`supabaseClient.js`:

```js
// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

`imageLoader.js` (excerpt):

- Reads from `imagerecord (file_name, people)`.
- `file_name` is expected to be a **full public URL** to the image.
- If your bucket isn’t public, adapt the loader to request **signed URLs**.

### 5) Using logoPath

```js
import { setLogoFixedPathsFromModel, getPointOnLogoPath, getPathsCount } from './logoPath.js';
import { loadGLBFromURL } from './glbLoader.js';

// Build orbits after the GLB is loaded
loadGLBFromURL('/TextureFixed-5.glb', scene, camera, (model) => {
  setLogoFixedPathsFromModel(model, scene);
  console.log('orbits ready:', getPathsCount()); // → 2
});

// In your animation loop
function tick(tSec) {
  const uTop = (tSec * 1.2) % 1;
  const uBottom = (tSec * 0.5) % 1;

  const pTop = getPointOnLogoPath(uTop, { pathIndex: 0 });
  const pBottom = getPointOnLogoPath(uBottom, { pathIndex: 1, xOffset: 0.1 });

  // spriteTop.position.copy(pTop);
  // spriteBottom.position.copy(pBottom);
}
```
getPointOnLogoPath uses getPointAt (arc-length). X is the only axis shifted by xOffset.

### 6) Using a different backend / hosting

If you don’t want to use Supabase:

1. **Create your own client** (or wrapper) by updating **`supabaseClient.js`** to export an object the app can call (or rename it and adjust imports).  
   It should provide whatever minimal methods your `imageLoader` expects (e.g., `list`, `getPublicUrl`, or a `fetchRecords()` function).
2. **Update `imageLoader.js`** to use your provider:
   - Replace calls to `supabase.from('imagerecord').select(...)` with your API calls.
   - If you store **paths** instead of full URLs, build public/signed URLs accordingly (e.g., S3/GCS).
3. Keep `VITE_PUBLIC_SUPABASE_BUCKET` semantics by mapping it to your storage container/bucket name, or replace its usage with your own env var.

---
## Risks & Mitigations

- **Missing/incorrect environment variables** (blank gallery; Supabase client throws).  
  **Mitigation:** require a `.env.local` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_PUBLIC_SUPABASE_BUCKET`. 

- **Storage permissions / CORS** (images fail to load).  
  **Mitigation:** use a **public** bucket for read-only content or generate **signed URLs**; document RLS/policies. Verify CORS for your frontend origin(s). Include a smoke test that fetches one known object.

- **Schema drift** (`imagerecord` shape changes; `file_name` not a full URL).  
  **Mitigation:** keep a minimal schema snippet in docs; validate in `imageLoader.js` (skip invalid rows; log counts and errors).

- **Large/slow images** (mobile jank, slow first paint).  
  **Mitigation:** store reasonably sized assets; enable CDN on the bucket; use mipmaps and `LinearMipmapLinearFilter`; optionally lazy-hydrate sprites; cap starfield/sprite counts on small screens.

- **Mobile performance & readability** (starfield too dense, GLB too close).  
  **Mitigation:** apply responsive tunables: reduce `initStarfield({ count, maxSizePx, brightness })` and adjust GLB framing on narrow viewports; optionally expose a `VITE_MOBILE_PROFILE` toggle that loads conservative defaults.

- **GLB/model assumptions** (`logoPath` expects at least 5 meshes to build two paths).  
  **Mitigation:** retain the circular-orbit fallback when paths cannot be built; log a clear warning; document the minimum GLB structure and how to swap the model in `/public`.

- **WebGL/runtime differences** (headless servers/CI/older browsers).  
  **Mitigation:** app-side: catch renderer creation errors and display a friendly fallback; test-side: run fast Node/jsdom tests with a fake renderer in CI and a small real-WebGL browser suite locally.

- **Security of anon key** (public client key misuse).  
  **Mitigation:** never commit `.env.local`; restrict anon role with read-only RLS/policies; prefer signed URLs if assets shouldn’t be public.

- **Rate limits / outages (Supabase/network)**.  
  **Mitigation:** cache already-loaded textures; handle fetch errors gracefully; include a tiny local placeholder sprite so the scene still renders.

- **Licensing / image provenance**.  
  **Mitigation:** document ownership/usage; optional watermarking before upload.

- **Accessibility & input** (focus traps, pointer-only).  
  **Mitigation:** ensure `Esc` exits focus mode; keep post-FX conservative; consider optional keyboard navigation to cycle images.

- **Handover & re-hosting** (stakeholder redeploy on their infra).  
  **Mitigation:** include per-surface runbooks (EC2 backend, Vercel FE/Admin), `.env.example`, and **smoke scripts** to verify deploys after cloning.

---
## Notes & Tips

- The code uses `import.meta.env.*` (Vite). If you switch bundlers, ensure env variables are still injected at build time.
- For public buckets, enable read policies or expose a CDN/public base URL.
- If no images appear:
  - Verify `imagerecord.file_name` values are valid, publicly accessible URLs.
  - Check CORS on your storage host.
  - Open DevTools → Network/Console for failed requests.
- Post-processing can be disabled for performance-constrained devices.

---

## File References (for convenience)

**`supabaseClient.js`**

```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

**`imageLoader.js`** *(excerpt – fetch images)*

```js
import { supabase } from './supabaseClient.js';

export async function loadImagesFromSupabase(scene) {
  const { data, error } = await supabase
    .from('imagerecord')
    .select('file_name, people');
  // ... map to sprites, set orbits, reshuffle, etc.
}
```

**`main.js`** *(excerpt – swap GLB path here)*

```js
import { loadGLBFromURL } from './glbLoader.js';

loadGLBFromURL('/TextureFixed-5.glb', scene, camera, () => {
  console.log('glb file loaded successfully');
});
```
