// RotationController.js (Full WebXR-adapted version)
import * as THREE from "three";

console.log("RotationController.js (Full WebXR) evaluating");

let camera = null; // May not be strictly needed
let renderer = null; // For DOM element event listeners (though these should be removed for XR)
let rotatableModel = null;

// WebXR specific state
let isRotatingXR = false;
let xrControllerReference = null; // Will be the XR controller (e.g., screen tap source)
let previousXRControllerMatrix = new THREE.Matrix4(); // Stores controller's world matrix from previous frame
let modelTargetQuaternion = new THREE.Quaternion(); // Target for smooth rotation

// Auto-rotation state
let isAutoRotating = false;
const autoRotationSpeed = THREE.MathUtils.degToRad(10); // Default: 10 degrees per second

export const RotationController = {
  init(threeRenderer, threeCamera) {
    // Added threeCamera
    console.log("RotationController (Full WebXR): init called");
    renderer = threeRenderer; // Store if needed
    camera = threeCamera; // Store camera
  },

  setRotatableModel(model) {
    rotatableModel = model;
    if (rotatableModel) {
      console.log(
        "RotationController (Full WebXR): Rotatable model set",
        rotatableModel.name || "Unnamed Model"
      );
      modelTargetQuaternion.copy(rotatableModel.quaternion); // Initialize target quaternion
    }
  },

  toggleAutoRotate() {
    if (!rotatableModel) return;
    isAutoRotating = !isAutoRotating;
    console.log("RotationController: Auto-rotate toggled to", isAutoRotating);
    if (isAutoRotating) {
      if (isRotatingXR) {
        isRotatingXR = false; // Stop manual rotation if auto-rotation is engaged
        xrControllerReference = null;
      }
    }
  },

  onXRSelectStart(controller, model) {
    if (model !== rotatableModel || !rotatableModel.visible) return;

    console.log("RotationController: onXRSelectStart");
    if (isAutoRotating) {
      isAutoRotating = false; // Stop auto-rotation when manual interaction starts
    }
    isRotatingXR = true;
    xrControllerReference = controller; // Store the controller
    previousXRControllerMatrix.copy(controller.matrixWorld); // Store initial controller matrix
    modelTargetQuaternion.copy(rotatableModel.quaternion); // Sync target with current model orientation
  },

  onXRRotate(controller) {
    if (!isRotatingXR || !rotatableModel || !xrControllerReference) return;

    const currentXRControllerMatrix = controller.matrixWorld;

    // Calculate the delta rotation of the controller
    // A simpler approach for screen-based "swipe to rotate Y":
    // Decompose controller matrices to get Y rotation difference.
    const prevEuler = new THREE.Euler().setFromRotationMatrix(
      previousXRControllerMatrix,
      "YXZ"
    );
    const currentEuler = new THREE.Euler().setFromRotationMatrix(
      currentXRControllerMatrix,
      "YXZ"
    );
    const deltaYAngle = currentEuler.y - prevEuler.y;

    // Apply this delta to the model's Y rotation
    rotatableModel.rotateY(deltaYAngle); // Rotate model around its local Y axis
    modelTargetQuaternion.copy(rotatableModel.quaternion); // Update target quaternion

    previousXRControllerMatrix.copy(currentXRControllerMatrix); // Update previous matrix for next frame
  },

  onXRSelectEnd() {
    console.log("RotationController: onXRSelectEnd");
    isRotatingXR = false;
    // xrControllerReference = null; // Keep or nullify? Nullify for now.
    xrControllerReference = null;
  },

  isRotatingXR() {
    return isRotatingXR;
  },

  update(deltaTime) {
    // deltaTime is from the main animation loop's clock
    if (isAutoRotating && rotatableModel && !isRotatingXR) {
      rotatableModel.rotateY(autoRotationSpeed * deltaTime); // Rotate around model's local Y axis
      modelTargetQuaternion.copy(rotatableModel.quaternion);
    }

    // Smooth rotation towards target if not actively XR rotating
    if (rotatableModel && !isRotatingXR) {
      // Only slerp if the difference is significant to prevent micro-movements
      if (!rotatableModel.quaternion.equals(modelTargetQuaternion)) {
        const step = 0.1; // Smoothing factor for slerp
        rotatableModel.quaternion.slerp(modelTargetQuaternion, step);
      }
    }
  },
};
