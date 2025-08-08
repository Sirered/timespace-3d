// resizeHandler.js
function resizeHandler(camera, renderer) {
  window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    const zoom = 10;

    camera.left = -zoom * aspect / 2;
    camera.right = zoom * aspect / 2;
    camera.top = zoom / 2;
    camera.bottom = -zoom / 2;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

export { resizeHandler };
