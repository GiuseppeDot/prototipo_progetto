// RotationController.js
console.log("RotationController.js evaluating");
import * as THREE from "three";

// let camera = null; // May not be strictly needed for rotation
// let renderer = null; // No longer for DOM events
let rotatableModel = null;

// let isRotating = false; // Replaced by isRotatingXR
// let previousMouseX = 0; // Old
let isAutoRotating = false;
const autoRotationSpeed = THREE.MathUtils.degToRad(10);
// let modelInitialXRotation = 0; // Old
// let modelInitialZRotation = 0; // Old

// --- New state variables for WebXR rotation ---
let isRotatingXR = false;
let xrControllerReference = null; // Reference to the XR controller (the one from renderer.xr.getController(0))
const previousXRControllerMatrix = new THREE.Matrix4(); // Stores the controller's world matrix from the previous frame
const currentXRControllerMatrix = new THREE.Matrix4();
