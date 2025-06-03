console.log("app.js executing");
import * as THREE from "three";
console.log("THREE version:", THREE.REVISION);
import { UIManager } from "./UIManager.js";
// import { ARController } from "./ARController.js"; // Commented out for WebXR
import { DragController } from "./DragController.js"; // Re-enable DragController
import { RotationController } from "./RotationController.js"; // Ensure this is imported
import { WebXRManager } from "./WebXRManager.js"; // Add this

// const clock = new THREE.Clock(); // clock will be defined in startApp

function startApp() {
  console.log("Window fully loaded and application starting...");
  const clock = new THREE.Clock(); // Moved clock definition here

  const threeCanvas = document.getElementById("three-canvas");
  if (!threeCanvas) {
    console.error("#three-canvas not found in the DOM!");
    return;
  }

  // --- THREE.JS SCENE SETUP ---
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight, // Initial aspect ratio
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
  // Initial size, UIManager will adjust later via handleResize
  renderer.setSize(window.innerWidth, window.innerHeight);

  // --- INITIALIZE MODULES ---
  RotationController.init(renderer);
  console.log("app.js: RotationController initialized.");

  // UIManager.init will call handleResize, which sets initial canvas size based on sidebar state
  UIManager.init(renderer, camera, threeCanvas, RotationController);
  console.log("app.js: UIManager initialized.");

  DragController.init(scene, camera, renderer); // Re-enable DragController init
  console.log("app.js: DragController initialized."); // Re-enable log

  // Initialize WebXRManager
  WebXRManager.init(renderer, scene, camera);
  console.log("app.js: WebXRManager initialized.");

  // Expose modules to the window object for global access if needed by other scripts/debugging
  window.UIManager = UIManager;
  window.DragController = DragController; // Re-enable DragController exposure
  window.RotationController = RotationController;
  window.WebXRManager = WebXRManager;
  console.log(
    "app.js: UIManager, DragController, RotationController, WebXRManager exposed on window object."
  );

  console.log("app.js: Firing WebXRManagerReady event.");
  document.dispatchEvent(new CustomEvent("WebXRManagerReady"));

  // Direct AR Initialization (assuming THREEx is ready after window.onload)
  // Commented out for WebXR integration
  /*
  if (typeof THREEx !== "undefined" && THREEx.ArToolkitContext) {
    console.log(
      "AR.js (THREEx) for Three.js appears to be loaded. Initializing AR system."
    );
    ARController.init(scene, camera, renderer);
    console.log("app.js: ARController initialized.");
  } else {
    console.error(
      "AR.js (THREEx) for Three.js not loaded correctly even after window.onload. AR features may not work."
    );
    // Optionally, display a message to the user in the UI or disable AR-specific UI elements
  }
  */

  // --- ANIMATION LOOP ---
  // The new signature for the animation loop callback is (timestamp, frame)
  renderer.setAnimationLoop((timestamp, frame) => {
    const deltaTime = clock.getDelta(); // deltaTime might still be useful

    // ARController.update(); // Still commented out
    RotationController.update(deltaTime);
    // DragController.update(); // No per-frame update needed for DragController as per current setup

    if (frame) {
      // Check if frame is available (it is during an active XR session)
      WebXRManager.update(frame); // Pass the frame to WebXRManager
    } else {
      // Optionally, call WebXRManager.update() without frame if it handles non-XR updates,
      // or if specific non-XR updates are needed.
      // For now, WebXRManager.update is primarily for XR frame logic.
      // If WebXRManager.update() can handle a null frame gracefully, this is fine:
      WebXRManager.update();
    }

    renderer.render(scene, camera);
  });
  console.log(
    "app.js: Animation loop set with renderer.setAnimationLoop, passing frame to WebXRManager.update."
  );
}

window.addEventListener("load", startApp);
