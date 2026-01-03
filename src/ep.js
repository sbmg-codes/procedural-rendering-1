import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color("#FFEECC");

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 50);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.physicallyCorrectLights = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.005;
controls.target.set(0, 0, 0);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const sunlight = new THREE.DirectionalLight(new THREE.Color("#ffff"), 3.5);
sunlight.position.set(10, 20, 10);
sunlight.castShadow = true;
renderer.shadowMap.enabled = true;
sunlight.shadow.mapSize.width = 512;
sunlight.shadow.mapSize.height = 512;
sunlight.shadow.camera.near = 0.5;
sunlight.shadow.camera.far = 100;
sunlight.shadow.camera.left = -10;
sunlight.shadow.camera.right = 10;
sunlight.shadow.camera.bottom = -10;
sunlight.shadow.camera.top = 10;

(async function () {
  //env map

  const pmrem = new THREE.PMREMGenerator(renderer);
  let envmapTexture = await new RGBELoader()
    .setDataType(THREE.FloatType)
    .loadAsync("/envmap.hdr");

  let envMap = pmrem.fromEquirectangular(envmapTexture).texture;
  // textures

  const textures = {
    bump: await new THREE.TextureLoader().loadAsync("/earthbump.jpg"),
    map: await new THREE.TextureLoader().loadAsync("/earthmap.jpg"),
    spec: await new THREE.TextureLoader().loadAsync("/earthspec.jpg"),
    planeTrailMask: await new THREE.TextureLoader().loadAsync("/mask.png"),
  };

  //plane

  const gltfLoader = new GLTFLoader();
  const plane = (await gltfLoader.loadAsync("/pl.glb")).scene.children[0];

  let planesData = [makePlane(plane, textures.planeTrailMask, envMap, scene)];

  //sphere

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(10, 70, 70),
    new THREE.MeshPhysicalMaterial({
      map: textures.map,
      envMap,
      roughnessMap: textures.spec,
      bumpMap: textures.bumpMap,
      sheen: 0.7,
      bumpScale: 100,
      sheenRoughness: 0.75,
      sheenColor: new THREE.Color("#ff8a00").convertSRGBToLinear(),
      clearcoat: 0.5,
    })
  );
  sphere.receiveShadow = true;
  scene.add(sunlight);
  scene.add(sphere);

  // clock

  const clock = new THREE.Clock();

  // render loop
  renderer.setAnimationLoop(() => {
    planesData.forEach((planeData) => {
      let plane = planeData.group;

      plane.position.set(0, 0, 0);
      plane.rotation.set(0, 0, 0);
      plane.rotateOnAxis(new THREE.Vector3(0, 0, 1), planeData.rad);
      plane.updateMatrixWorld();
      const delta = clock.getDelta();

      planeData.rot += delta * 0.25;
      plane.rotateOnAxis(new THREE.Vector3(0, 1, 0), planeData.rot);
      plane.rotateOnAxis(new THREE.Vector3(0, 0, 1), planeData.rad);
      plane.translateY(planeData.yOff);
      plane.rotateOnAxis(new THREE.Vector3(1, 0, 0), +Math.PI * 0.5);
      scene.add(plane);
    });
    controls.update();
    renderer.render(scene, camera);
  });
})();

function makePlane(planeMesh, trailTexture, envmap, scene) {
  let plane = planeMesh.clone();
  plane.scale.set(0.001, 0.001, 0.001);
  plane.position.set(0, 0, 0);
  plane.rotation.set(0, 0, 0);
  plane.updateMatrixWorld();

  plane.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.material.envMap = envmap;
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  let group = new THREE.Group();
  group.add(plane);

  return {
    group,
    yOff: 10.5 + Math.random() * 1.0,
    rad: Math.random() * Math.PI * 0.45 + 0.2,
    rot: 0,
  };
}
