// ARController.js
console.log("ARController.js evaluating");
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// THREEx will be a global from the ar-threex.js script

// Module-level variables for AR.js components and Three.js core
let _scene = null;
let _camera = null;
let _renderer = null;
let _arToolkitSource = null;
let _arToolkitContext = null;
let _markerRoot = null;
let currentDisplayModel = null; // Model currently displayed on the marker
const gltfLoader = new GLTFLoader();
const loadedModelCache = {}; // Cache for loaded GLTF models
let currentModelPath = null; // Path of the model currently on the marker, e.g., "Cibo.glb"


// Function to be called from the main animation loop in app.js
// The prompt for app.js correctly defines an 'animate' function that calls requestAnimationFrame(animate),
// ARController.update(), and renderer.render().
// This global 'updateAR' function, especially its requestAnimationFrame(updateAR) call,
// would create a conflicting animation loop. It should not be used if app.js manages the loop.
// The ARController.update() method (in the exported object) is what app.js will call.
/*
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
*/

export const ARController = {
  init(threeScene, threeCamera, threeRenderer) {
    console.log("ARController.init called - Activating AR.js marker tracking.");
    _scene = threeScene;
    _camera = threeCamera;
    _renderer = threeRenderer;

    // Initialize AR Toolkit Source (Webcam)
    _arToolkitSource = new THREEx.ArToolkitSource({
      sourceType: "webcam",
      // sourceWidth: window.innerWidth > window.innerHeight ? 640 : 480, // Optional: explicit source size
      // sourceHeight: window.innerWidth > window.innerHeight ? 480 : 640, // Optional: explicit source size
    });

    _arToolkitSource.init(() => {
      // Use a timeout to ensure the video element is sized before first resize
      setTimeout(() => {
        this.onResize(); // Call ARController's onResize method
        console.log(
          "ARController: ARToolkitSource initialized. Video dimensions:",
          _arToolkitSource.domElement.videoWidth,
          _arToolkitSource.domElement.videoHeight
        );
      }, 500); // Delay may need adjustment
    });

    // Initialize AR Toolkit Context (Marker Detection Engine)
    _arToolkitContext = new THREEx.ArToolkitContext({
      cameraParametersUrl:
        THREEx.ArToolkitContext.baseURL + "../data/data/camera_para.dat", // Default camera parameters
      detectionMode: "mono", // mono_and_matrix if using matrix codes, otherwise mono
      patternRatio: 0.8, // Percentage of marker image used for pattern recognition
    });

    _arToolkitContext.init(() => {
      // After context is initialized, set the camera projection matrix
      _camera.projectionMatrix.copy(_arToolkitContext.getProjectionMatrix());
      console.log(
        "ARController: AR Toolkit Context initialized, camera projection matrix set."
      );
    });

    // Initialize Marker Root and Controls
    _markerRoot = new THREE.Group();
    _scene.add(_markerRoot);

    new THREEx.ArMarkerControls(_arToolkitContext, _markerRoot, {
      type: "pattern",
      patternUrl: "./asset/markerQR.patt", // Ensure this path is correct
      changeMatrixMode: "cameraTransformMatrix", // Recommended for AR
    });

    // Add lighting - this is fine to keep
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    _scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    _scene.add(directionalLight);

    console.log(
      "ARController initialized for AR.js marker tracking."
    );
  },

  onResize() {
    // This function is primarily for AR.js internals to react to video stream dimension changes.
    // UIManager.handleResize is responsible for the main canvas's visible size and aspect ratio.
    if (_arToolkitSource && _arToolkitSource.ready) {
      _arToolkitSource.onResizeElement();
      _arToolkitSource.copySizeTo(_renderer.domElement);

      if (_arToolkitContext && _arToolkitContext.arController) {
        // Update context's internal canvas size for processing, based on video dimensions
        _arToolkitContext.arController.canvas.width =
          _arToolkitSource.domElement.videoWidth;
        _arToolkitContext.arController.canvas.height =
          _arToolkitSource.domElement.videoHeight;

        // Update camera projection matrix based on new video dimensions / aspect ratio
        _camera.projectionMatrix.copy(_arToolkitContext.getProjectionMatrix());
        console.log(
          "ARController.onResize: AR components and camera projection updated based on video dimensions."
        );
      }
    }
  },

  update() {
    if (!_arToolkitSource || !_arToolkitContext) return;

    if (_arToolkitSource.ready !== false) {
      _arToolkitContext.update(_arToolkitSource.domElement);
      // This updates _markerRoot.visible and its transform based on marker detection
    }

    const desiredModelUrl = window.UIManager?.getSelectedModelUrl(); // e.g., "Cibo.glb"

    if (_markerRoot.visible) {
      if (desiredModelUrl && (currentModelPath !== desiredModelUrl || !currentDisplayModel)) {
        // Remove previous model if any
        if (currentDisplayModel) {
          _markerRoot.remove(currentDisplayModel);
          currentDisplayModel = null;
        }
        currentModelPath = desiredModelUrl;
        const fullModelPath = './asset/' + desiredModelUrl;

        if (loadedModelCache[fullModelPath]) {
          currentDisplayModel = loadedModelCache[fullModelPath].clone(); // Clone for multiple instances if needed, or just reuse
          _markerRoot.add(currentDisplayModel);
          // Apply default scale/rotation
          currentDisplayModel.scale.set(0.1, 0.1, 0.1); // Adjust as needed
          currentDisplayModel.rotation.set(0, 0, 0); // Adjust as needed
          console.log(`ARController: Loaded ${desiredModelUrl} from cache onto marker.`);
        } else {
          gltfLoader.load(fullModelPath, (gltf) => {
            const newModel = gltf.scene;
            // Apply default scale/rotation
            newModel.scale.set(0.1, 0.1, 0.1); // Adjust as needed
            newModel.rotation.set(0, 0, 0); // Adjust as needed

            loadedModelCache[fullModelPath] = newModel.clone(); // Cache the original loaded scene
            currentDisplayModel = newModel;
            _markerRoot.add(currentDisplayModel);
            console.log(`ARController: Loaded ${desiredModelUrl} dynamically onto marker.`);
          }, undefined, (error) => {
            console.error(`ARController: Error loading model ${fullModelPath}:`, error);
            currentModelPath = null; // Reset so it tries to load again next time
          });
        }
      }
      if (currentDisplayModel) {
        currentDisplayModel.visible = true;
      }
    } else { // Marker not visible
      if (currentDisplayModel) {
        currentDisplayModel.visible = false;
      }
      // Optionally clear currentModelPath if model should reload when marker reappears,
      // or keep it to quickly show the same model. For now, keep it.
      // currentModelPath = null;
    }
  },
};
