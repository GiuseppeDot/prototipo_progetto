import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer, canvas, modal, loader;
let model = null;
let animId = null;

function init() {
  modal = document.getElementById('previewModal');
  canvas = document.getElementById('previewCanvas');
  if (!modal || !canvas) return;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    45,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 2);

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  loader = new GLTFLoader();

  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  scene.add(light);

  animate();
}

function animate() {
  animId = requestAnimationFrame(animate);
  if (model) {
    model.rotation.y += 0.01;
  }
  renderer.render(scene, camera);
}

function resize() {
  if (!renderer || !camera) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function show(modelUrl) {
  if (!scene) init();
  if (!scene) return;
  if (model) {
    scene.remove(model);
    model = null;
  }
  loader.load(modelUrl, (gltf) => {
    model = gltf.scene;
    scene.add(model);
  });
  modal.style.display = 'flex';
  resize();
}

function close() {
  if (modal) modal.style.display = 'none';
  if (model && scene) {
    scene.remove(model);
    model = null;
  }
}

document.getElementById('closePreview')?.addEventListener('click', close);
window.addEventListener('resize', resize);

export const Preview3D = { show, close };
window.Preview3D = Preview3D;

