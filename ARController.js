// ARController.js
console.log("ARController.js evaluating");
import * as THREE from "three";
import { DragController } from "./DragController.js"; // Added import
// THREEx will be a global from the ar-threex.js script

let scene = null;
let camera = null;
let renderer = null;
let arToolkitSource = null;
let arToolkitContext = null;
let markerRoot = null; // This will be the Three.js group associated with the marker
let placeholderModel = null; // A simple THREE.Mesh
let modelHasBeenPlaced = false; // New variable

// Function to be called from the main animation loop in app.js
// The prompt for app.js correctly defines an 'animate' function that calls requestAnimationFrame(animate),
// ARController.update(), and renderer.render().
// This global 'updateAR' function, especially its requestAnimationFrame(updateAR) call,
// would create a conflicting animation loop. It should not be used if app.js manages the loop.
// The ARController.update() method (in the exported object) is what app.js will call.
function updateAR() {
  if (arToolkitSource && arToolkitSource.ready !== false) {
    arToolkitSource.copySizeTo(renderer.domElement);
    if (arToolkitContext) {
      arToolkitContext.update(arToolkitSource.domElement);
    }
  }
  if (scene && camera) {
    renderer.render(scene, camera);
  }
  // requestAnimationFrame(updateAR); // This line is in the prompt, but it will create a
  // conflicting loop with app.js's animate function.
  // app.js's animate function is the preferred way to manage the loop.
  // This global function will not be called by app.js as per app.js's new code.
}

export const ARController = {
  init(threeScene, threeCamera, threeRenderer) {
    console.log("ARController.init called");
    scene = threeScene;
    camera = threeCamera;
    renderer = threeRenderer;

    // Initialize AR Toolkit Source (Webcam)
    arToolkitSource = new THREEx.ArToolkitSource({
      sourceType: "webcam",
    });

    arToolkitSource.init(() => {
      // Handle resize after source is ready
      // Use a timeout to ensure the video element is sized
      setTimeout(() => {
        this.onResize(); // Call ARController's onResize method
        console.log(
          "ARController: ARToolkitSource initialized, onResize called. Video dimensions:",
          arToolkitSource.domElement.videoWidth,
          arToolkitSource.domElement.videoHeight
        );
      }, 500); // Delay may need adjustment
    });

    // Initialize AR Toolkit Context (Marker Detection Engine)
    arToolkitContext = new THREEx.ArToolkitContext({
      cameraParametersUrl:
        THREEx.ArToolkitContext.baseURL + "../data/data/camera_para.dat", // Default camera parameters
      detectionMode: "mono", // Or 'color_and_matrix' etc.
      patternRatio: 0.8, // Percentage of marker image used for pattern recognition
    });

    arToolkitContext.init(() => {
      // After context is initialized, set the camera projection matrix
      camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
      console.log(
        "ARController: AR Toolkit Context initialized, camera projection matrix set."
      );
    });

    // Initialize Marker Root and Controls
    markerRoot = new THREE.Group();
    scene.add(markerRoot);

    new THREEx.ArMarkerControls(arToolkitContext, markerRoot, {
      type: "pattern",
      patternUrl: "./markerQR.patt", // Path relative to the HTML file (test.html)
      changeMatrixMode: "cameraTransformMatrix", // Recommended for AR
    });

    // Create a placeholder model (e.g., a cube)
    const geometry = new THREE.BoxGeometry(1, 1, 1); // Size 1x1x1 units
    const material = new THREE.MeshNormalMaterial({
      transparent: true,
      opacity: 0.7,
    });
    placeholderModel = new THREE.Mesh(geometry, material);
    // placeholderModel.position.y = 0.5; // Initial position will be set on first marker detection
    scene.add(placeholderModel); // Add to main scene
    placeholderModel.visible = false; // Initially invisible
    DragController.setDraggableModel(placeholderModel);
    // RotationController.setRotatableModel(placeholderModel); // Assuming RotationController is also integrated

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    console.log(
      "ARController initialized with THREEx AR.js components. Placeholder model added."
    );
  },

  onResize() {
    // This function is primarily for AR.js internals to react to video stream dimension changes.
    // UIManager.handleResize is responsible for the main canvas's visible size and aspect ratio.
    if (arToolkitSource && arToolkitSource.ready) {
      arToolkitSource.onResizeElement(); // Let AR.js adjust the video element style if it needs to.
      arToolkitSource.copySizeTo(renderer.domElement);

      if (arToolkitContext && arToolkitContext.arController) {
        // Update context's internal canvas size for processing, based on video dimensions
        arToolkitContext.arController.canvas.width =
          arToolkitSource.domElement.videoWidth;
        arToolkitContext.arController.canvas.height =
          arToolkitSource.domElement.videoHeight;

        // Update camera projection matrix based on new video dimensions / aspect ratio
        camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
        console.log(
          "ARController.onResize: AR components and camera projection updated based on video dimensions."
        );
      }
    }
  },

  update() {
    // Existing ARToolkit update
    if (arToolkitSource && arToolkitSource.ready !== false) {
      if (arToolkitContext) {
        arToolkitContext.update(arToolkitSource.domElement);
        // This updates markerRoot.visible and its transform based on marker detection
      }
    }

    // New logic for initial model placement
    if (markerRoot && camera && placeholderModel) {
      // Ensure all are initialized
      if (markerRoot.visible) {
        if (!modelHasBeenPlaced) {
          // Calculate screen center position
          const distance = 1.5;
          const targetPosition = new THREE.Vector3(0, 0, -distance);

          // Transform targetPosition from camera space to world space
          targetPosition.applyMatrix4(camera.matrixWorld);

          placeholderModel.position.copy(targetPosition);

          // Set initial orientation (upright, facing camera)
          placeholderModel.rotation.x = -Math.PI / 2;
          placeholderModel.rotation.y = Math.PI;
          placeholderModel.rotation.z = 0;

          placeholderModel.visible = true;
          modelHasBeenPlaced = true;
          console.log(
            "ARController: Model placed at screen center.",
            placeholderModel.position
          );
        }
      } else {
        // Marker is lost. Model remains visible and interactive at its last position.
        // If modelHasBeenPlaced is true, we do nothing here.
        // If different behavior is needed (e.g., hide model), it would go here.
      }
    }
  },
};
