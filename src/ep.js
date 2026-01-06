import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import anime from "https://cdn.skypack.dev/animejs@3.2.1";

const scene = new THREE.Scene();
// scene.background = new THREE.Color("#FFEECC");

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
sunlight.lookAt(0, 0, 0);

const moonLight = new THREE.DirectionalLight(
  new THREE.Color("#77ccff").convertSRGBToLinear(),
  0.4
);

moonLight.position.set(-10, 20, 10);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 512;
moonLight.shadow.mapSize.height = 512;
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 100;
moonLight.shadow.camera.left = -10;
moonLight.shadow.camera.right = 10;
moonLight.shadow.camera.bottom = -10;
moonLight.shadow.camera.top = 10;

// ring scene and camera

const ringScene = new THREE.Scene();
const ringsCamera = new THREE.PerspectiveCamera(
  45,
  innerWidth / innerHeight,
  0.1,
  1000
);
ringsCamera.position.set(0, 0, 50);

// mouse pos

const mousePos = new THREE.Vector2(0, 0);
window.addEventListener("mousemove", (e) => {
  const x = e.clientX;
  const y = e.clientY;

  mousePos.x = mousePos.x * 0.003;
  mousePos.y = mousePos.y * 0.003;
});

const sunBackground = document.querySelector(".sun-background");
console.log(sunBackground);

(async function () {
  //env map

  const pmrem = new THREE.PMREMGenerator(renderer);
  let envmapTexture = await new RGBELoader()
    .setDataType(THREE.FloatType)
    .loadAsync("/envmap.hdr");
  let envMap = pmrem.fromEquirectangular(envmapTexture).texture;

  const ring1 = new THREE.Mesh(
    new THREE.RingGeometry(15, 13.5, 80, 1, 0),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#FFC88E")
        .convertSRGBToLinear()
        .multiplyScalar(200),
      roughness: 0.25,
      envMap: envMap,
      envMapIntensity: 1.7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    })
  );
  ringScene.add(ring1);
  ring1.sunOpacity = 0.35;
  ring1.moonOpacity = 0.03;

  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(16.5, 15.75, 80, 1, 0),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#FFC88E")
        .convertSRGBToLinear()
        .multiplyScalar(200),
      roughness: 0.25,
      envMap: envMap,
      envMapIntensity: 1.7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    })
  );
  ring2.sunOpacity = 0.32;
  ring2.moonOpacity = 0.1;
  ringScene.add(ring2);

  const ring3 = new THREE.Mesh(
    new THREE.RingGeometry(18, 17.75, 80, 1, 0),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#FFC88E")
        .convertSRGBToLinear()
        .multiplyScalar(200),
      roughness: 0.25,
      envMap: envMap,
      envMapIntensity: 1.7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    })
  );
  ringScene.add(ring3);

  ring3.sunOpacity = 0.35;
  ring3.moonOpacity = 0.03;

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

  planesData.forEach((p) => scene.add(p.group));
  const sunIntensity = 0.7;
  const moonIntensity = 0.3;

  // render loop

  const clock = new THREE.Clock();

  const moonBackground = document.querySelector(".moon-background");

  let daytime = true;
  let animating = false;

  window.addEventListener("keydown", (e) => {

    let obj = { t: 0 };

    if (animating) return;

    let anim;
    if (!daytime) {
      anim = [1, 0];
    } else if (daytime) {
      anim = [0, 1];
    } else {
      return;
    }

    anime({
      targets: obj,
      t: anim,
      complete: () => {
        animating = false;
        daytime = !daytime;
      },
      update: () => {
        sunlight.intensity = 3.5 * (1 - obj.t);
        moonLight.intensity = 3.5 * obj.t;

        sunlight.position.set(20 * (1 - obj.t));
        moonLight.position.set(20 * obj.t);
        sphere.material.sheen = 1 - obj.t;

        sunBackground.style.opacity = 1 - obj.t;
        moonBackground.style.opacity = obj.t;

        scene.children.forEach((child) => {
          child.traverse((object) => {
            if (object instanceof THREE.Mesh && object.material.envMap) {
              object.envMapIntensity =
                object.envMapIntensity * (1 - obj.t) + moonIntensity * obj.t;
            }
          });
        });
      },

      duration: 500,
      easing: "easeInOutSine",
    });
  });

  //animation

  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    planesData.forEach((planeData) => {
      let plane = planeData.group;

      plane.position.set(0, 0, 0);
      plane.rotation.set(0, 0, 0);
      plane.updateMatrixWorld();
      plane.rotateOnAxis(new THREE.Vector3(0, 0, 1), planeData.rad);
      // const delta = clock.getDelta();

      planeData.rot += delta * 0.25;
      plane.rotateOnAxis(planeData.randomAxis, planeData.randomAxisRot);
      plane.rotateOnAxis(new THREE.Vector3(0, 1, 0), planeData.rot);
      plane.rotateOnAxis(new THREE.Vector3(0, 0, 1), planeData.rad);
      plane.translateY(planeData.yOff);
      plane.rotateOnAxis(new THREE.Vector3(1, 0, 0), +Math.PI * 0.5);
      // scene.add(plane);
    });
    controls.update();
    renderer.render(scene, camera);

    ring1.rotation.x = ring1.rotation.x * 0.95 + mousePos.y * 0.05 * 1.2;
    ring1.rotation.y = ring1.rotation.y * 0.95 + mousePos.x * 0.05 * 1.2;

    ring2.rotation.x = ring2.rotation.x * 0.95 + mousePos.y * 0.05 * 0.375;
    ring2.rotation.y = ring2.rotation.y * 0.95 + mousePos.x * 0.05 * 0.375;

    ring3.rotation.x = ring3.rotation.x * 0.95 - mousePos.y * 0.05 * 0.375;
    ring3.rotation.y = ring3.rotation.y * 0.95 - mousePos.x * 0.05 * 0.375;

    renderer.autoClear = false;
    renderer.render(ringScene, ringsCamera);
    renderer.autoClear = true;
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

  let trail = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 2),
    new THREE.MeshPhysicalMaterial({
      envMap: envmap,
      envMapIntensity: 3,

      roughness: 0.4,
      metalness: 0,
      transmission: 1,

      transparent: true,
      opacity: 1,
      alphaMap: trailTexture,
      side: THREE.DoubleSide,
    })
  );

  trail.rotateX(Math.PI);
  trail.translateY(1.1);

  let group = new THREE.Group();
  group.add(trail);
  group.add(plane);

  return {
    group,
    yOff: 10.5 + Math.random() * 1.0,
    rad: Math.random() * Math.PI * 0.45 + 0.2,
    rot: Math.random() * Math.PI * 2.0,
    randomAxisRot: Math.random() * Math.PI * 2.0,
    randomAxis: new THREE.Vector3(nr(), nr(), nr()).normalize(),
  };
}

function nr() {
  return Math.random() * 2 - 1;
}
