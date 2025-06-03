// DragController.js (Full WebXR-adapted version)
import * as THREE from "three";

console.log("DragController.js (Full WebXR) evaluating");

let camera = null; // Should be the WebXR camera
let renderer = null; // Not used for event listeners anymore, but might be needed if raycaster uses it.
let draggableModel = null;
let scene = null; // For raycasting and model's coordinate space

// WebXR specific state
let isDraggingXR = false;
const xrDragPlane = new THREE.Plane();
let xrControllerReference = null; // This will be the XRInputSource's gripSpace or targetRaySpace
const dragStartModelPositionXR = new THREE.Vector3();
let initialIntersectionOffset = new THREE.Vector3(); // Offset from model's origin to initial hit point

// Raycaster for WebXR
// const raycaster = new THREE.Raycaster(); // Raycaster is instantiated in WebXRManager, not needed here if not used directly.

export const DragController = {
  init(threeScene, threeCamera, threeRenderer) {
    console.log("DragController (Full WebXR): init called");
    scene = threeScene;
    camera = threeCamera; // This camera will be updated by WebXR
    renderer = threeRenderer; // Store if needed
  },

  setDraggableModel(model) {
    draggableModel = model;
    if (draggableModel) {
      console.log(
        "DragController (Full WebXR): Draggable model set",
        draggableModel.name || "Unnamed Model"
      );
    }
  },

  onXRSelectStart(controller, model, intersectionPoint) {
    if (model !== draggableModel || !draggableModel.visible) return;

    console.log("DragController: onXRSelectStart");
    isDraggingXR = true;
    xrControllerReference = controller; // Store the controller (renderer.xr.getController(0))

    // Plane is defined by a normal (camera forward) and a point (initial intersection)
    // This means the object will move on a plane parallel to the camera's view plane at the depth of the initial hit.
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection); // Make sure 'camera' is the active WebXR camera
    xrDragPlane.setFromNormalAndCoplanarPoint(
      cameraDirection.negate(),
      intersectionPoint
    );

    // Calculate and store the offset from the model's origin to the intersection point
    initialIntersectionOffset
      .copy(intersectionPoint)
      .sub(draggableModel.position);

    dragStartModelPositionXR.copy(draggableModel.position); // Store initial position for reference
  },

  onXRDrag(controller) {
    if (!isDraggingXR || !draggableModel || !xrControllerReference) return;

    // Get the controller's current pose matrix
    const controllerMatrixWorld = controller.matrixWorld;

    // Create a ray from the controller's position in its pointing direction
    const rayOrigin = new THREE.Vector3().setFromMatrixPosition(
      controllerMatrixWorld
    );
    const rayDirection = new THREE.Vector3(0, 0, -1).applyMatrix4(
      new THREE.Matrix4().extractRotation(controllerMatrixWorld)
    );
    const currentRay = new THREE.Ray(rayOrigin, rayDirection);

    const intersection = new THREE.Vector3();
    if (currentRay.intersectPlane(xrDragPlane, intersection)) {
      // Move the model so that the initial hit point (relative to model origin) is now at the new intersection point.
      draggableModel.position.copy(intersection).sub(initialIntersectionOffset);
    }
  },

  onXRSelectEnd() {
    console.log("DragController: onXRSelectEnd");
    isDraggingXR = false;
    // xrControllerReference = null; // Keep for potential quick re-selection? Or nullify. Let's nullify for now.
    xrControllerReference = null;
  },

  isDraggingXR() {
    return isDraggingXR;
  },
};
