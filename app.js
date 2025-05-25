console.log("app.js executing");
import * as THREE from "three";
console.log("THREE version:", THREE.REVISION);
import { UIManager } from "./UIManager.js";
import { ARController } from "./ARController.js";
import { DragController } from "./DragController.js";
import { RotationController } from "./RotationController.js"; // Ensure this is imported

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

  DragController.init(scene, camera, renderer);
  console.log("app.js: DragController initialized.");

  // Direct AR Initialization (assuming THREEx is ready after window.onload)
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

  // --- ANIMATION LOOP ---
  function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    ARController.update();
    RotationController.update(deltaTime);
    // DragController.update(); // No per-frame update needed

    renderer.render(scene, camera);
  }

  console.log("app.js: Starting animation loop.");
  animate();
}

window.addEventListener("load", startApp);
