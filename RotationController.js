// RotationController.js
console.log("RotationController.js evaluating");
import * as THREE from "three";

let camera = null; // May not be strictly needed for rotation if model is origin-centered
let renderer = null; // For DOM element event listeners
let rotatableModel = null; // The model to be rotated

let isRotating = false;
let previousMouseX = 0;
let isAutoRotating = false; // Added for auto-rotation
const autoRotationSpeed = THREE.MathUtils.degToRad(10); // Radians per second (approx 10 deg/sec)
// We assume the model's initial X and Z rotations are set (e.g., by ARController for uprightness)
// This controller will only modify the Y rotation.
// The model's current X and Z rotation values should be preserved.
let modelInitialXRotation = 0;
let modelInitialZRotation = 0;

function onMouseDown(event) {
  if (!rotatableModel || !rotatableModel.visible) return;

  if (isAutoRotating) {
    isAutoRotating = false; // Stop auto-rotation when manual interaction starts
    console.log(
      "RotationController: Auto-rotate stopped by manual interaction."
    );
  }

  // Check if the model itself is clicked (optional, like in DragController)
  // For now, assume rotation can start on any mousedown if model is visible
  isRotating = true;
  previousMouseX = event.clientX || (event.touches && event.touches[0].clientX);

  // Store the model's current X and Z rotation if they need to be preserved strictly
  // This assumes these are set by something else (e.g. ARController placing it upright)
  // And this controller should only add to Y rotation.
  modelInitialXRotation = rotatableModel.rotation.x;
  modelInitialZRotation = rotatableModel.rotation.z;

  // renderer.domElement.style.cursor = 'ew-resize'; // Indicate rotation
}

function onMouseMove(event) {
  if (!isRotating || !rotatableModel || !rotatableModel.visible) return;

  const currentMouseX =
    event.clientX || (event.touches && event.touches[0].clientX);
  const deltaX = currentMouseX - previousMouseX;
  previousMouseX = currentMouseX;

  const rotationSpeed = 0.01; // Radians per pixel dragged
  rotatableModel.rotation.y += deltaX * rotationSpeed;

  // Ensure X and Z rotations are maintained if needed (e.g., if they were set to specific values)
  // rotatableModel.rotation.x = modelInitialXRotation;
  // rotatableModel.rotation.z = modelInitialZRotation;
  // However, if the model is a child of markerRoot which itself might rotate,
  // directly setting world rotation or carefully managing local rotations is important.
  // For now, we only add to local Y. The placeholder model from ARController is upright (X=-PI/2).
  // So, we should preserve that X rotation.
  rotatableModel.rotation.x = -Math.PI / 2; // Assuming this is the standard upright rotation
  rotatableModel.rotation.z = 0; // Assuming Z should be zero
}

function onMouseUp() {
  if (isRotating) {
    isRotating = false;
    // renderer.domElement.style.cursor = 'grab'; // Or default if not draggable
  }
}

export const RotationController = {
  init(threeRenderer) {
    console.log("RotationController.init called");
    renderer = threeRenderer;

    renderer.domElement.addEventListener("mousedown", onMouseDown, false);
    renderer.domElement.addEventListener("mousemove", onMouseMove, false);
    renderer.domElement.addEventListener("mouseup", onMouseUp, false);
    // Touch events
    renderer.domElement.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        onMouseDown(e.touches[0]);
      },
      { passive: false }
    );
    renderer.domElement.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        onMouseMove(e.touches[0]);
      },
      { passive: false }
    );
    renderer.domElement.addEventListener("touchend", onMouseUp, false);

    console.log("RotationController initialized with event listeners.");
  },

  setRotatableModel(model) {
    rotatableModel = model;
    if (rotatableModel) {
      console.log("RotationController: Rotatable model set", rotatableModel);
      // Initialize stored rotations if needed, or assume they are set externally first.
      // modelInitialXRotation = rotatableModel.rotation.x;
      // modelInitialZRotation = rotatableModel.rotation.z;
    }
  },

  toggleAutoRotate() {
    isAutoRotating = !isAutoRotating;
    console.log("RotationController: Auto-rotate toggled to", isAutoRotating);
    if (isAutoRotating && rotatableModel) {
      if (isRotating) {
        // If manual rotation was active
        isRotating = false; // Stop manual rotation
      }
    }
  },

  update(deltaTime) {
    if (isAutoRotating && rotatableModel && !isRotating) {
      // Only auto-rotate if not manually rotating
      rotatableModel.rotation.y += autoRotationSpeed * deltaTime;
      // Ensure X and Z rotations are maintained (consistent with manual rotation part)
      rotatableModel.rotation.x = -Math.PI / 2;
      rotatableModel.rotation.z = 0;
    }
  },
};
