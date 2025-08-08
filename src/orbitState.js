// orbitState.js
const orbitImages = [];

const selectedImage = {
  value: null,
};

function setSelectedImage(mesh) {
  selectedImage.value = mesh;
}

export { orbitImages, selectedImage, setSelectedImage };
