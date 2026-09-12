// public/js/arshad-hub-client.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- Initialization ---
const canvas = document.getElementById('three-canvas');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.08);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(0, 1.5, 5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 2.2;
controls.maxDistance = 9;
controls.target.set(0, 1.1, 0);
controls.update();

// --- Lighting ---
const hemiLight = new THREE.HemisphereLight(0x00ff88, 0x080820, 0.6);
scene.add(hemiLight);

const spotLight = new THREE.SpotLight(0x00e0ff, 3, 20, Math.PI / 4, 0.3, 1);
spotLight.position.set(0, 6, 6);
spotLight.target.position.set(0, 1, 0);
scene.add(spotLight);
scene.add(spotLight.target);

const backLight = new THREE.PointLight(0x00ffaa, 1.6, 30);
backLight.position.set(0, 4, -5);
scene.add(backLight);

// --- Environment / Platform ---
const platformGeometry = new THREE.CircleGeometry(4, 64);
const platformMaterial = new THREE.MeshStandardMaterial({
  color: 0x021012,
  emissive: 0x022a29,
  emissiveIntensity: 0.7,
  metalness: 0.7,
  roughness: 0.4,
  side: THREE.DoubleSide,
});
const platform = new THREE.Mesh(platformGeometry, platformMaterial);
platform.rotation.x = -Math.PI / 2;
platform.position.y = 0;
scene.add(platform);

const ringGeometry = new THREE.RingGeometry(3.2, 3.6, 64);
const ringMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ffc8,
  transparent: true,
  opacity: 0.6,
  side: THREE.DoubleSide,
});
const ring = new THREE.Mesh(ringGeometry, ringMaterial);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.01;
scene.add(ring);

// --- Post-processing (Glow Effect) ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.2,
  0.4,
  0.85
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- Matrix Rain (digital rain) ---
// پیاده‌سازی یک باران دیجیتال سه‌بعدی ساده با استفاده از Points
const RAIN_COUNT = 2200;
const rainGeometry = new THREE.BufferGeometry();
const rainPositions = new Float32Array(RAIN_COUNT * 3);
const rainSpeeds = new Float32Array(RAIN_COUNT);

const RAIN_AREA_XZ = 18;
const RAIN_MAX_HEIGHT = 16;
const RAIN_MIN_HEIGHT = -2.5;

for (let i = 0; i < RAIN_COUNT; i++) {
  const ix = i * 3;
  rainPositions[ix] = (Math.random() - 0.5) * RAIN_AREA_XZ; // x
  rainPositions[ix + 1] = Math.random() * RAIN_MAX_HEIGHT; // y
  rainPositions[ix + 2] = (Math.random() - 0.5) * RAIN_AREA_XZ; // z
  rainSpeeds[i] = 0.8 + Math.random() * 1.6; // سرعت سقوط متفاوت
}

rainGeometry.setAttribute(
  'position',
  new THREE.BufferAttribute(rainPositions, 3)
);

const rainMaterial = new THREE.PointsMaterial({
  color: 0x00ff88,
  size: 0.06,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.95,
  depthWrite: false,
});

const matrixRain = new THREE.Points(rainGeometry, rainMaterial);
matrixRain.position.y = 0.5;
scene.add(matrixRain);

function updateMatrixRain(delta, elapsedTime) {
  const positions = rainGeometry.attributes.position.array;

  for (let i = 0; i < RAIN_COUNT; i++) {
    const ix = i * 3;
    const speed = rainSpeeds[i];

    positions[ix + 1] -= speed * delta * 4.0;

    if (positions[ix + 1] < RAIN_MIN_HEIGHT) {
      positions[ix] = (Math.random() - 0.5) * RAIN_AREA_XZ;
      positions[ix + 1] = RAIN_MAX_HEIGHT + Math.random() * 4;
      positions[ix + 2] = (Math.random() - 0.5) * RAIN_AREA_XZ;
      rainSpeeds[i] = 0.8 + Math.random() * 1.6;
    }
  }

  // افکت تنفس شدت باران
  const flicker = 0.8 + 0.3 * Math.sin(elapsedTime * 1.7);
  rainMaterial.opacity = 0.65 + 0.35 * flicker;

  rainGeometry.attributes.position.needsUpdate = true;
}

// --- Interactive GLTF Model (central robot/agent) ---
let model = null;
let mixer = null;
let actions = [];

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  'https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/'
);
loader.setDRACOLoader(dracoLoader);

loader.load(
  '/models/robot.glb', // مسیر مدل خود را وارد کنید
  (gltf) => {
    model = gltf.scene;

    // تنظیم موقعیت و مقیاس مدل
    model.position.set(0, 0.1, 0);
    const s = 1.4;
    model.scale.set(s, s, s);

    // فعال کردن glow روی بخش‌های emissive
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if ('emissive' in child.material) {
            child.material.emissive = new THREE.Color(0x00ffea);
            child.material.emissiveIntensity = 0.5;
          }
          if ('metalness' in child.material) {
            child.material.metalness = 0.7;
            child.material.roughness = 0.25;
          }
        }
      }
    });

    scene.add(model);

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      actions = gltf.animations.map((clip) => {
        const action = mixer.clipAction(clip);
        action.clampWhenFinished = true;
        action.loop = THREE.LoopOnce;
        return action;
      });
    }
  },
  undefined,
  (error) => {
    console.error('❌ خطا در بارگذاری /models/robot.glb:', error);
  }
);

const actionButton = document.getElementById('action-button');
if (actionButton) {
  actionButton.addEventListener('click', () => {
    if (!actions || actions.length === 0) return;

    // توقف و ریست همهٔ انیمیشن‌ها
    actions.forEach((a) => {
      a.stop();
      a.reset();
    });

    // پخش اولین انیمیشن
    const action = actions[0];
    action.reset();
    action.play();
  });
}

// --- Mouse Interaction (model lookAt) ---
const mouse = new THREE.Vector2(0, 0);
const targetLookAt = new THREE.Vector3(0, 1.4, 3);
const _tempLookAt = new THREE.Vector3();

window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

function updateModelLookAt(delta) {
  if (!model) return;

  _tempLookAt.set(mouse.x, mouse.y, 0.5);
  _tempLookAt.unproject(camera);

  targetLookAt.lerp(_tempLookAt, Math.min(1, delta * 5));
  model.lookAt(targetLookAt);
}

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
  const delta = clock.getDelta();
  const elapsedTime = clock.elapsedTime;

  updateMatrixRain(delta, elapsedTime);
  updateModelLookAt(delta);

  if (mixer) {
    mixer.update(delta);
  }

  ring.rotation.z += delta * 0.35;

  controls.update();

  composer.render();

  requestAnimationFrame(animate);
}

animate();

// --- Handle Resize ---
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
});
