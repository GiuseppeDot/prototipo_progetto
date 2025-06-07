import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let xrSession = null;
let xrReferenceSpace = null;
let renderer = null; // This will be the Three.js renderer from app.js
let scene = null; // This will be the Three.js scene from app.js
let camera = null; // This will be the Three.js camera from app.js
let hitTestSource = null;
let reticle = null;
let currentModel = null; // To store the currently placed model
let pendingModelUrl = null; // Store model to place when surface is detected
const gltfLoader = new GLTFLoader(); // Instantiate GLTFLoader
const raycaster = new THREE.Raycaster(); // For interaction raycasting
let xrController = null; // Represents the primary input (e.g., screen tap)
let activeInputSource = null; // Tracks the input source during interaction
let reticleHasShownSurfaceMessage = false; // To show surface detected message only once

const WebXRManager = {
  init(threeRenderer, threeScene, threeCamera) {
    renderer = threeRenderer;
    scene = threeScene; // Storing the scene reference
    camera = threeCamera;
    this.scene = scene; // Make scene accessible within placeModel via this.scene

    // Create reticle
    const reticleGeometry = new THREE.RingGeometry(0.05, 0.07, 32).rotateX(
      -Math.PI / 2
    );
    const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle); // Add reticle to the scene

    const startXRButton = document.getElementById("startXRButton");
    if (startXRButton) {
      // Button is initially hidden by CSS, and should be disabled until QR scan.
      startXRButton.disabled = true;
      startXRButton.addEventListener("click", this.activateXR.bind(this));
    } else {
      console.error("Start XR Button not found");
    }

    // Basic check for WebXR support - still useful to log support
    if (navigator.xr) {
      navigator.xr.isSessionSupported("immersive-ar").then((supported) => {
        if (supported) {
          // Don't enable the button here, just log support.
          // prepareForXRSession will handle enabling it.
          console.log("Immersive AR session is supported.");
        } else {
          if (startXRButton) startXRButton.disabled = true; // Keep it disabled if not supported
          console.log(
            "Immersive AR session is NOT supported. Start AR button will remain disabled."
          );
        }
      });
    } else {
      if (startXRButton) startXRButton.disabled = true; // Keep it disabled if no WebXR API
      console.error(
        "WebXR API not available. Start AR button will remain disabled."
      );
    }
  },

  prepareForXRSession() {
    console.log("WebXRManager: Preparing for XR session after QR code scan.");
    const startXRButton = document.getElementById("startXRButton");
    const qrScannerUI = document.getElementById("qrScannerUI");

    if (qrScannerUI) {
      qrScannerUI.style.display = "none";
    } else {
      console.error("QR Scanner UI not found for hiding.");
    }
    window.UIManager?.showARStatusMessage(
      "QR code scanned! Click 'Start AR'.",
      0
    );

    if (startXRButton) {
      // Enable the button only if AR is supported (checked in init)
      if (navigator.xr && startXRButton.disabled === true) {
        // Check if it was disabled due to lack of support
        navigator.xr.isSessionSupported("immersive-ar").then((supported) => {
          if (supported) {
            startXRButton.disabled = false;
            startXRButton.style.display = "block"; // Make it visible
            console.log("Start AR button enabled and visible.");
          } else {
            console.error(
              "Cannot enable Start AR button, Immersive AR not supported."
            );
          }
        });
      } else if (navigator.xr) {
        // if XR is available and button wasn't disabled for lack of support
        startXRButton.disabled = false;
        startXRButton.style.display = "block"; // Make it visible
        console.log("Start AR button enabled and visible.");
      } else {
        console.error(
          "Cannot enable Start AR button, WebXR API not available."
        );
      }
    }
  },

  async activateXR() {
    const startXRButton = document.getElementById("startXRButton");
    if (startXRButton && startXRButton.disabled) {
      console.warn("activateXR called but Start AR button is disabled.");
      return;
    }

    if (window.UIManager) {
      window.UIManager.hideReselectSurfaceButton(); // Ensure it's hidden initially when session starts
    }

    if (navigator.xr) {
      try {
        // Request an immersive-ar session.
        xrSession = await navigator.xr.requestSession("immersive-ar", {
          requiredFeatures: ["hit-test", "dom-overlay", "local-floor"], // Added local-floor
          domOverlay: { root: document.body }, // Example: use body as overlay root
        });
        console.log("WebXR session started:", xrSession);
        window.UIManager?.showARStatusMessage(
          "AR Session Started. Look for a flat surface.",
          5000
        );
        reticleHasShownSurfaceMessage = false; // Reset for new session

        // Set up the WebGL layer for Three.js
        await renderer.xr.setSession(xrSession);
        if (window.UIManager) {
          window.UIManager.enterARMode();
        }

        // Get the reference space
        // Using 'local' reference space for hit-testing, assuming it's a floor-level or bounded space.
        xrReferenceSpace = await xrSession.requestReferenceSpace("local");
        console.log(
          "WebXRManager: xrReferenceSpace obtained.",
          xrReferenceSpace
        );

        // Request hit-test source
        // Using 'viewer' space for requesting hit-test source as it's often more stable for pointing.
        // The hit results will then be posed against 'local' (xrReferenceSpace).
        const viewerSpace = await xrSession.requestReferenceSpace("viewer");
        xrSession
          .requestHitTestSource({ space: viewerSpace })
          .then((source) => {
            hitTestSource = source;
            console.log("WebXRManager: Hit-test source obtained.");
          })
          .catch((e) => console.error("Failed to get hit test source:", e));

        // Setup the XR controller (representing screen tap / primary input)
        xrController = renderer.xr.getController(0);
        scene.add(xrController); // Add to scene for matrix updates

        xrSession.addEventListener("end", this.onXRSessionEnded.bind(this));

        // Event listener for initial model placement (on 'select')
        xrSession.addEventListener("select", (event) => {
          // Place model only if reticle is visible AND no interaction is active
          if (reticle && reticle.visible && !activeInputSource) {
            const modelUrl = window.UIManager?.getSelectedModelUrl();
            if (modelUrl) {
              const fullModelUrl = `./asset/${modelUrl}`;
              this.placeModel(fullModelUrl, reticle.matrix);
            } else {
              console.warn("No model selected to place.");
            }
          } else if (activeInputSource) {
            console.log(
              "Select event ignored for placement: interaction in progress."
            );
          } else {
            console.log(
              "Select event ignored for placement: reticle not visible."
            );
          }
        });

        // Event listeners for starting interaction with an existing model
        xrSession.addEventListener("selectstart", (event) => {
          if (currentModel) {
            const inputSource = event.inputSource;
            // Update controller's matrix for raycasting
            // xrController's matrix should be automatically updated by Three.js if it's from renderer.xr.getController()
            // and added to the scene.

            const controllerMatrixWorld = xrController.matrixWorld;
            const rayOrigin = new THREE.Vector3().setFromMatrixPosition(
              controllerMatrixWorld
            );
            const rayDirection = new THREE.Vector3(0, 0, -1).applyMatrix4(
              new THREE.Matrix4().extractRotation(controllerMatrixWorld)
            );
            raycaster.set(rayOrigin, rayDirection);

            const intersects = raycaster.intersectObject(currentModel, true);

            if (intersects.length > 0) {
              activeInputSource = inputSource;
              if (window.DragController)
                window.DragController.onXRSelectStart(
                  xrController,
                  currentModel,
                  intersects[0].point
                ); // Re-enable
              if (window.RotationController)
                window.RotationController.onXRSelectStart(
                  xrController,
                  currentModel
                );
              if (reticle) reticle.visible = false; // Hide reticle during interaction
              console.log(
                "WebXRManager: selectstart hit currentModel. Interaction started."
              );
            } else {
              console.log(
                "WebXRManager: selectstart did not hit currentModel."
              );
            }
          }
        });

        xrSession.addEventListener("selectend", (event) => {
          if (activeInputSource && event.inputSource === activeInputSource) {
            if (window.DragController) window.DragController.onXRSelectEnd(); // Re-enable
            if (window.RotationController)
              window.RotationController.onXRSelectEnd();
            activeInputSource = null;
            console.log("WebXRManager: selectend. Interaction ended.");
            // Reticle visibility will be handled by the update loop.
          }
        });
      } catch (e) {
        console.error("Failed to start WebXR session:", e);
      }
    } else {
      console.error("WebXR not available for activation.");
    }
  },

  onXRSessionEnded() {
    if (window.UIManager) {
      window.UIManager.exitARMode();
    }
    xrSession = null;
    if (renderer.xr) renderer.xr.setSession(null);
    console.log("WebXR session ended.");

    if (hitTestSource) {
      hitTestSource.cancel();
      hitTestSource = null;
      console.log("WebXRManager: Hit-test source cancelled.");
    }
    if (reticle) {
      reticle.visible = true;
    }
    if (window.UIManager) {
      window.UIManager.hideReselectSurfaceButton(); // Ensure it's hidden when session ends
    }
    window.UIManager?.showARStatusMessage("AR Session Ended.", 3000);
    if (currentModel) {
      scene.remove(currentModel);
      currentModel = null;
      console.log("WebXRManager: Current model removed from scene.");
    }

    const startXRButton = document.getElementById("startXRButton");
    if (startXRButton) {
      startXRButton.style.display = "none";
      startXRButton.disabled = true;
    }

    const qrScannerUI = document.getElementById("qrScannerUI");
    if (qrScannerUI) {
      qrScannerUI.style.display = "flex"; // Show QR scanner
    }

    // Signal test.js to restart QR scanning
    // This could be a custom event or a direct function call if test.js exposes one
    console.log("WebXRManager: Signaling to restart QR scanning.");
    if (window.restartQRScanning) {
      // Assuming test.js will define this
      window.restartQRScanning();
    } else {
      console.warn(
        "WebXRManager: window.restartQRScanning function not found. QR scanning might not restart automatically."
      );
    }
  },

  getXRSession() {
    return xrSession;
  },

  getReferenceSpace() {
    return xrReferenceSpace;
  },

  // This update function would be called from the main animation loop (app.js)
  update(frame) {
    // Accept the XRFrame object
    if (!renderer.xr.isPresenting) {
      // Not in XR session
      if (reticle) reticle.visible = false;
      return;
    }

    // Handle active interaction (dragging/rotating)
    if (activeInputSource && xrController) {
      if (window.DragController?.isDraggingXR()) {
        // Re-enable
        window.DragController.onXRDrag(xrController);
      }
      if (window.RotationController?.isRotatingXR()) {
        window.RotationController.onXRRotate(xrController);
      }
      // Reticle should remain hidden during active interaction
      if (reticle) reticle.visible = false;
      return; // Skip hit-testing if interacting
    }

    // Handle hit-testing for reticle visibility if not interacting and no model placed yet,
    // or if a model is placed but we want reticle for new placement (requires currentModel to be nullified first)
    // The activeInputSource check is to prevent reticle showing during drag/rotate.
    if (
      frame &&
      hitTestSource &&
      xrReferenceSpace &&
      !currentModel &&
      !activeInputSource
    ) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(xrReferenceSpace);
        if (reticle && pose) {
          reticle.visible = true;
          reticle.matrix.fromArray(pose.transform.matrix);
          reticle.material.color.set(0x00ff00); // Set to GREEN when surface is detected

          if (!reticleHasShownSurfaceMessage) {
            window.UIManager?.showARStatusMessage(
              "Surface detected. Tap to place model.",
              5000
            );
            reticleHasShownSurfaceMessage = true;
          }

          if (pendingModelUrl) {
            this.placeModel(pendingModelUrl, reticle.matrix);
            pendingModelUrl = null;
          }
        }
      } else {
        if (reticle) {
          reticle.visible = false;
          reticle.material.color.set(0xffffff); // Reset to WHITE when no surface
        }
        // If surface is lost, allow the message to show again when a new surface is found
        // Consider if this should be here or when reticle becomes visible again.
        // For now, this means message shows once per "reticle visible" sequence.
        // reticleHasShownSurfaceMessage = false;
      }
    } else if (reticle) {
      // If conditions for hit-testing aren't met (e.g., model is placed or interaction ongoing)
      reticle.visible = false;
      if (!activeInputSource && !currentModel) {
        // Only reset color if not hidden due to interaction or placed model
        reticle.material.color.set(0xffffff); // Reset to WHITE
      }
    }
  },

  placeModel(modelUrl, matrix) {
    console.log(`WebXRManager: Attempting to place model ${modelUrl}`);
    if (currentModel) {
      this.scene.remove(currentModel);
      // TODO: Properly dispose of old model's geometry and materials if memory becomes an issue
      currentModel = null;
      console.log("WebXRManager: Removed previous model.");
    }

    gltfLoader.load(
      modelUrl,
      (gltf) => {
        currentModel = gltf.scene;
        currentModel.position.setFromMatrixPosition(matrix);

        // Basic scaling - adjust as needed
        const defaultScale = 0.1; // Example scale factor
        // Check if model name suggests a specific scale
        // This is a simple heuristic, a more robust system might use metadata from UIManager
        if (modelUrl.includes("bruschetta") || modelUrl.includes("Cibo")) {
          currentModel.scale.set(
            defaultScale * 2,
            defaultScale * 2,
            defaultScale * 2
          ); // Bruschetta might be smaller
        } else if (modelUrl.includes("Margherita")) {
          currentModel.scale.set(
            defaultScale * 5,
            defaultScale * 5,
            defaultScale * 5
          );
        } else if (modelUrl.includes("Carbonara")) {
          currentModel.scale.set(
            defaultScale * 4,
            defaultScale * 4,
            defaultScale * 4
          );
        } else {
          currentModel.scale.set(defaultScale, defaultScale, defaultScale);
        }

        // Initial rotation (e.g., make it upright if necessary)
        // currentModel.rotation.set(0, 0, 0); // Adjust if models are not Y-up

        this.scene.add(currentModel);
        if (reticle) reticle.visible = false; // Hide reticle after successful placement
        console.log("WebXRManager: Model placed successfully.", currentModel);
        window.UIManager?.showARStatusMessage("Model placed!", 3000);
        reticleHasShownSurfaceMessage = false; // Allow surface message again if model is removed / new placement starts

        // Integrate with DragController and RotationController
        // Assuming these are exposed on window and can handle WebXR controller inputs or touch
        if (
          window.DragController &&
          typeof window.DragController.setDraggableModel === "function"
        ) {
          // Re-enable
          window.DragController.setDraggableModel(currentModel);
          console.log("WebXRManager: Model set as draggable.");
        }
        if (
          window.RotationController &&
          typeof window.RotationController.setRotatableModel === "function"
        ) {
          window.RotationController.setRotatableModel(currentModel);
          console.log("WebXRManager: Model set as rotatable.");
        }

        if (window.UIManager) {
          window.UIManager.showReselectSurfaceButton(); // Show button after model is placed
        }
      },
      undefined,
      (error) => {
        console.error("Error loading GLTF model in WebXRManager:", error);
      }
    );
  },

  placeModelWhenSurfaceFound(modelUrl) {
    pendingModelUrl = modelUrl;
  },

  clearPlacedModelAndReselectSurface() {
    console.log("WebXRManager: Clearing placed model and reselecting surface.");
    if (currentModel) {
      // Use this.currentModel if it's part of the object scope, or ensure currentModel is accessible
      this.scene.remove(currentModel); // Assuming this.scene is valid
      // TODO: Dispose of geometry/materials if this.currentModel won't be reused
      currentModel = null;
    }
    if (reticle) {
      reticle.visible = true;
      reticle.material.color.set(0xffffff); // Reset color to white for new search
    }
    reticleHasShownSurfaceMessage = false;

    // Inform the user
    if (
      window.UIManager &&
      typeof window.UIManager.showARStatusMessage === "function"
    ) {
      window.UIManager.showARStatusMessage(
        "Point at a new surface to place the model.",
        4000
      );
    }

    // Hide the reselect button as we are now in "selection" mode
    if (window.UIManager) {
      window.UIManager.hideReselectSurfaceButton();
    }
  },

  hotSwapPlacedModel(newModelFileName) {
    if (!renderer.xr.isPresenting) {
      // Check if in an active XR session
      console.warn(
        "WebXRManager.hotSwapPlacedModel: Not in an active XR session. Model selection will apply on next placement."
      );
      // UIManager.setSelectedModelUrl has already been called.
      // Inform user that next placement will use the new model.
      if (
        window.UIManager &&
        typeof window.UIManager.showARStatusMessage === "function"
      ) {
        window.UIManager.showARStatusMessage(
          `${newModelFileName.replace(
            ".glb",
            ""
          )} selected. Tap surface to place.`,
          3000
        );
      }
      return;
    }

    const newModelUrl = "./asset/" + newModelFileName; // Prepend path
    console.log("WebXRManager: Hot-swapping model to:", newModelUrl);

    if (currentModel) {
      // If a model is currently placed, save its transformation matrix
      const previousMatrix = currentModel.matrix.clone();

      // Remove the old model
      this.scene.remove(currentModel);
      // Consider proper disposal of old model's geometry/material here
      currentModel = null;

      // Call placeModel with the new URL and the previous model's matrix
      this.placeModel(newModelUrl, previousMatrix);

      if (
        window.UIManager &&
        typeof window.UIManager.showARStatusMessage === "function"
      ) {
        window.UIManager.showARStatusMessage(
          `Changed model to ${newModelFileName.replace(".glb", "")}!`,
          3000
        );
      }
    } else {
      // If no model is currently placed, UIManager.setSelectedModelUrl has already updated the next model.
      // The user can then tap to place it using the normal placement flow.
      if (
        window.UIManager &&
        typeof window.UIManager.showARStatusMessage === "function"
      ) {
        window.UIManager.showARStatusMessage(
          `${newModelFileName.replace(
            ".glb",
            ""
          )} selected. Tap surface to place.`,
          3000
        );
      }
      // Ensure reticle is visible if no model is placed, so user can place the newly selected one
      if (reticle) {
        reticle.visible = true;
        reticle.material.color.set(0xffffff); // Ensure it's white for searching
      }
      reticleHasShownSurfaceMessage = false; // Allow surface detected message again
    }
  },
};

export { WebXRManager };
