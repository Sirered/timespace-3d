# TIMELab / TIMESpace 3D Gallery Documentation

This project is a 3D infinite-orbiting gallery designed to showcase images from Supabase alongside a GLB model. It provides an immersive space-like environment with animated starfields, orbiting images, and interactive focus features.

---

## Overview

The gallery works by combining several modular components:
- **Scene setup**: Initializes Three.js rendering, camera, and lights.
- **Starfield background**: Procedurally generated star layers that orbit relative to the camera.
- **Image loader**: Fetches image records from Supabase and places them on orbiting paths around the GLB model.
- **Focus interaction**: Allows clicking an image to center it, pausing orbiting, and then releasing it back smoothly.
- **Post-processing**: Bloom, vignette, and film grain effects create a cinematic presentation.

---

## Setup and Environment

### Dependencies

Install the required dependencies via npm:

```bash
npm install three @supabase/supabase-js
```

Optional (if using shaders or postprocessing):

```bash
npm install three/examples/jsm
```

### Supabase

The project uses a Supabase table `imagerecord` with the following fields:
- `file_name` (string) → full public URL to the image
- `people` (JSON object) → metadata for filtering and grouping

Supabase client is configured in `supabaseClient.js`.

---

## Project Structure

```
src/
├── main.js                 # Entry point, initializes scene, camera, renderer, and controls
├── setupScene.js           # Configures base Three.js scene
├── setupCamera.js          # Orthographic camera setup
├── setupRenderer.js        # Renderer initialization with color settings
├── setupLights.js          # Ambient, key, fill, and rim lights
├── starfield.js            # Generates and updates the star background
├── supabaseImageLoader.js  # Loads images from Supabase, maps textures to meshes, pushes to orbitImages
├── focusInteraction.js     # Handles click-to-focus interactions
├── animate.js              # Main animation loop, handles orbiting, updates, and rendering
├── glbLoader.js            # Loads and frames GLB models
├── resizeHandler.js        # Adjusts renderer and camera on resize
├── postfx.js               # Postprocessing effects (bloom, vignette, film grain)
```

---

## Key Components

### `main.js`
The application entry point. It:
1. Creates scene, camera, renderer, and controls.
2. Adds starfield and lights.
3. Loads Supabase images and GLB model.
4. Sets up post-processing.
5. Runs animation loop (`animate.js`).
6. Starts with intro zoom effect.

### `starfield.js`
Generates stars in layered slabs, twinkling and moving with the camera. Creates parallax depth.

### `supabaseImageLoader.js`
Fetches images from Supabase and maps them as textured planes orbiting the GLB model. Images maintain correct aspect ratios, transparency, and orbit paths.

### `focusInteraction.js`
Enables users to click an image:
- Selected image moves to the center.
- Orbiting pauses.
- On release, the image transitions back to its orbit position.

### `animate.js`
Controls the render loop. Updates starfield, orbit positions, focus states, and runs rendering through either a renderer or EffectComposer.

### `postfx.js`
Adds cinematic enhancements:
- **UnrealBloomPass** → glows around bright edges.
- **VignetteShader** → subtle darkening at edges to center focus.
- **FilmPass** → faint film grain.

### `setupLights.js`
Lighting designed for balanced visibility:
- Ambient light for global illumination.
- Directional key, fill, and rim lights for contrast.
- Hemisphere light for environmental balance.

---

## Configuration Options

- **Starfield (`initStarfield`)**:
  - `count`: number of stars
  - `depthOffsets`: layer depth positions
  - `brightness`, `sizeMult`, `maxSizePx`: adjust star visuals

- **Image Loader**:
  - Mesh material can be swapped between `MeshStandardMaterial` (matte) or `MeshPhysicalMaterial` (glossy).
  - Orbit radius and offsets configurable.

- **Focus Interaction**:
  - Transition durations and easing functions adjustable.

- **PostFX**:
  - Bloom strength, vignette intensity, and film grain can be tuned in `setupPostFX`.

---

## Usage

Start the project with a local dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

The gallery will render full screen in your browser.

---

## Notes
- The project is modular: each file handles one responsibility.
- Postprocessing is optional and can be disabled for performance.
- Supabase provides the data source for orbiting images, but you can adapt `supabaseImageLoader.js` to other APIs.
