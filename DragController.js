// DragController.js
console.log("DragController.js evaluating");
// import * as THREE from 'three'; // Removed: THREE is global now

let camera = null;
let renderer = null; // For DOM element event listeners
let draggableModel = null; // The model to be dragged (e.g., placeholderModel from ARController)
let scene = null; // For raycasting if needed, and for model's coordinate space

let isDragging = false;
const dragStartMouse = new THREE.Vector2(); // Mouse position at drag start (NDC)
const dragStartModelPosition = new THREE.Vector3(); // Model position in world space at drag start

// This plane is parallel to the camera's near plane, at the model's initial distance
const dragPlane = new THREE.Plane(); 
const raycaster = new THREE.Raycaster();
const intersection = new THREE.Vector3(); // To store intersection point with dragPlane

function onMouseDown(event) {
  if (!draggableModel || !draggableModel.visible) return;

  // Determine if it's a touch event or mouse event
  const clientX = event.clientX !== undefined ? event.clientX : event.touches[0].clientX;
  const clientY = event.clientY !== undefined ? event.clientY : event.touches[0].clientY;

  // Calculate mouse position in normalized device coordinates (-1 to +1)
  const rect = renderer.domElement.getBoundingClientRect();
  dragStartMouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  dragStartMouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  // Check if the model is clicked (optional, for now, assume dragging starts on any mousedown if model is visible)
  // raycaster.setFromCamera(dragStartMouse, camera);
  // const intersects = raycaster.intersectObject(draggableModel, true);
  // if (intersects.length > 0) {
       isDragging = true;
       // renderer.domElement.style.cursor = 'grabbing'; // Optional: change cursor

       // Set up the drag plane based on the model's current position and camera view
       dragPlane.setFromNormalAndCoplanarPoint(
           camera.getWorldDirection(new THREE.Vector3()), // Normal is camera's view direction (stored in dragPlane.normal by method)
           draggableModel.position // Plane passes through the model's current position
       );

       // Save the initial model position
       dragStartModelPosition.copy(draggableModel.position);
  // }
}

function onMouseMove(event) {
  if (!isDragging || !draggableModel || !draggableModel.visible) return;

  event.preventDefault(); // Prevent scrolling on touch devices

  const clientX = event.clientX !== undefined ? event.clientX : event.touches[0].clientX;
  const clientY = event.clientY !== undefined ? event.clientY : event.touches[0].clientY;

  const rect = renderer.domElement.getBoundingClientRect();
  const currentMouse = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  );

  raycaster.setFromCamera(currentMouse, camera);
  
  // Raycast against the drag plane
  if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
      // The 'intersection' point is where the mouse ray hits the plane.
      // We want to move the model to this point.
      draggableModel.position.copy(intersection);
  }
}

function onMouseUp() {
  if (isDragging) {
    isDragging = false;
    // renderer.domElement.style.cursor = 'grab'; // Optional: revert cursor
  }
}
 
export const DragController = {
  init(threeScene, threeCamera, threeRenderer) {
    console.log("DragController.init called");
    scene = threeScene;
    camera = threeCamera;
    renderer = threeRenderer; // Needed for event listeners on the canvas

    // Add event listeners to the renderer's DOM element (the canvas)
    renderer.domElement.addEventListener('mousedown', onMouseDown, false);
    renderer.domElement.addEventListener('mousemove', onMouseMove, false);
    renderer.domElement.addEventListener('mouseup', onMouseUp, false);
    
    // For touch events
    // Pass event directly to handlers, they will check for touches[0]
    renderer.domElement.addEventListener('touchstart', onMouseDown, { passive: false });
    renderer.domElement.addEventListener('touchmove', onMouseMove, { passive: false });
    renderer.domElement.addEventListener('touchend', onMouseUp, false);
     
    console.log("DragController initialized with event listeners.");
  },

  // Call this method from ARController when a model is loaded and ready to be dragged
  setDraggableModel(model) {
    draggableModel = model;
    if (draggableModel) {
      console.log("DragController: Draggable model set", draggableModel.name || "Unnamed Model");
      // Optional: set initial cursor style if model is immediately draggable
      // renderer.domElement.style.cursor = 'grab';
    } else {
      // renderer.domElement.style.cursor = 'default';
    }
  },

  update() {
    // Currently, no specific update logic needed here per frame
    // unless complex physics or constraints are added.
  }
};
