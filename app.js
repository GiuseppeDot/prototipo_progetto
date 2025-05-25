console.log("app.js executing");
import * as THREE from "three";
console.log("THREE version:", THREE.REVISION);
import { UIManager } from "./UIManager.js";
import { ARController } from "./ARController.js";
import { DragController } from "./DragController.js";
import { RotationController } from "./RotationController.js"; // Ensure this is imported

const clock = new THREE.Clock(); // Added for deltaTime

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");

  if (typeof THREEx === "undefined" || !THREEx.ArToolkitContext) {
    console.error("AR.js (THREEx) for Three.js not loaded correctly.");
  } else {
    console.log("AR.js (THREEx) for Three.js appears to be loaded.");
  }

  const threeCanvas = document.getElementById("three-canvas");
  if (!threeCanvas) {
    console.error("#three-canvas not found in the DOM!");
    return;
  }

  // Actual renderer and camera will be initialized later, possibly in ARController.
  // UIManager.init is designed to handle null for renderer/camera for now (it will log warnings).
  // UIManager.init(null, null, threeCanvas);

  // Further initializations for ARController, etc., will go here later.
  // console.log("app.js: UIManager initialized."); // Commented out as it's called later

  // --- THREE.JS SCENE SETUP ---
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5; // Default camera position, AR will override

  const renderer = new THREE.WebGLRenderer({
    canvas: threeCanvas,
    alpha: true, // For transparency if AR background is separate
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  // Initial size, UIManager will adjust
  renderer.setSize(window.innerWidth, window.innerHeight);

  // --- INITIALIZE MODULES ---
  // UIManager needs renderer and camera for its handleResize, and now RotationController
  RotationController.init(renderer); // Initialize RotationController
  console.log("app.js: RotationController initialized.");

  UIManager.init(renderer, camera, threeCanvas, RotationController); // Pass RotationController
  console.log("app.js: UIManager initialized.");

  ARController.init(scene, camera, renderer);
  console.log("app.js: ARController initialized.");

  DragController.init(scene, camera, renderer);
  console.log("app.js: DragController initialized.");

  // --- ANIMATION LOOP ---
  function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta(); // Get deltaTime

    ARController.update(); // Update AR.js components (marker tracking)
    RotationController.update(deltaTime); // Call update with deltaTime
    // DragController.update(); // No per-frame update needed for DragController

    renderer.render(scene, camera);
  }

  console.log("app.js: Starting animation loop.");
  animate(); // Start the animation loop
});
