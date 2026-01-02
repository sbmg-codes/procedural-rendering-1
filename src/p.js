import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createNoise2D } from "simplex-noise";

const scene = new THREE.Scene();
scene.background = new THREE.Color("#FFEECC");

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 50);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.physicallyCorrectLights = true;
document.body.appendChild(renderer.domElement);

const i = 1e43;

// const simplex = new simplexNoise();

function textureLoad(path) {
  const tl = new THREE.TextureLoader();
  const t = tl.load(path);
  return t;
}

let envmap;

const light = new THREE.DirectionalLight(
  new THREE.Color("#FFC88E").convertSRGBToLinear(),
  3
);

light.position.set(20, 40, 20);
light.target.position.set(0, 0, 0);

light.castShadow = true;
light.shadow.mapSize.set(2048, 2048);
light.shadow.camera.near = 1;
light.shadow.camera.far = 100;
light.shadow.camera.left = -30;
light.shadow.camera.right = 30;
light.shadow.camera.top = 30;
light.shadow.camera.bottom = -30;

scene.add(light);
scene.add(light.target);

const MAX_HEIGHT = 10;
const STONE_HEIGHT = MAX_HEIGHT * 0.9;
const DIRT_HEIGHT = MAX_HEIGHT * 0.7;
const DIRT2_HEIGHT = 0;
const SAND_HEIGHT = MAX_HEIGHT * 0.4;
const GRASS_HEIGHT = MAX_HEIGHT * 0.2;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.005;
controls.target.set(0, 0, 0);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

(async function (params) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envmapTexture = await new RGBELoader()
    .setDataType(THREE.FloatType)
    .loadAsync("/envmap.hdr");

  envmap = pmrem.fromEquirectangular(envmapTexture).texture;

  for (let i = -15; i <= 15; i++) {
    for (let j = -15; j <= 15; j++) {
      const noise2d = createNoise2D();

      let noise = (noise2d(i * 0.1, j * 0.1) + 1) * 0.5;
      let pos = tileToPosition(i, j);
      noise = Math.pow(noise, 1.2);
      if (pos.length() > 16) continue;
      makeHex(noise * MAX_HEIGHT, pos);
    }
  }

  const stoneMesh = hexMesh(stoneGeo, textureLoad("/stone.png"));
  const dirtMesh = hexMesh(dirtGeo, textureLoad("/dirt.png"));
  const dirt2Mesh = hexMesh(dirt2Geo, textureLoad("/dirt2.jpg"));
  const sandMesh = hexMesh(sandGeo, textureLoad("/sand.jpg"));
  const grassMesh = hexMesh(grassGeo, textureLoad("/grass.jpg"));
  scene.add(stoneMesh, dirtMesh, dirt2Mesh, sandMesh, grassMesh);
  // const waterMesh = hexMesh(waterGeo, textureLoad("/water.jpg"));

  let seaMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(17, 17, MAX_HEIGHT * 0.2, 50),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#55aaff").convertSRGBToLinear().multiplyScalar(3),
      ior: 1.4,
      transmission: 1,
      transparent: true,
      envMap: envmap,
      roughness: 1,
      metalness: 0.024,
      roughnessMap: textureLoad("/water.jpg"),
      metalnessMap: textureLoad("/water.jpg"),
    })
  );

  seaMesh.receiveShadow = true;
  seaMesh.position.set(0, MAX_HEIGHT * 0.1, 0);
  scene.add(seaMesh);

  const mapcontainer = new THREE.Mesh(
    new THREE.CylinderGeometry(17.1, 17.1, MAX_HEIGHT * 0.25, 50, 1, true),
    new THREE.MeshPhysicalMaterial({
      envMap: envmap,
      map: textureLoad("/dirt.png"),
      envMapIntensity: 0.2,
      side: THREE.DoubleSide,
    })
  );

  mapcontainer.receiveShadow = true;
  mapcontainer.position.set(0, MAX_HEIGHT * 0.125, 0);
  scene.add(mapcontainer);

  const mapFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(19.5, 19.5, MAX_HEIGHT * 0.1),
    new THREE.MeshPhysicalMaterial({
      envMap: envmap,
      map: textureLoad("/dirt.png"),
      envMapIntensity: 0.2,
      side: THREE.DoubleSide,
    })
  );

  mapFloor.receiveShadow = true;
  mapFloor.position.set(0, -MAX_HEIGHT * 0.01, 0);
  scene.add(mapFloor);

  clouds();

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
})();

// geometries - for each type

let dirtGeo = new THREE.BoxGeometry(0, 0, 0);
let dirt2Geo = new THREE.BoxGeometry(0, 0, 0);
let sandGeo = new THREE.BoxGeometry(0, 0, 0);
let waterGeo = new THREE.BoxGeometry(0, 0, 0);
let stoneGeo = new THREE.BoxGeometry(0, 0, 0);
let grassGeo = new THREE.BoxGeometry(0, 0, 0);

let hexaGeometries = new THREE.BoxGeometry(0, 0, 0);
function generateGeo(height, pos) {
  let geo = new THREE.CylinderGeometry(1, 1, height, 6, 1, false);
  geo.translate(pos.x, height * 0.5, pos.y);

  return geo;
}

function tileToPosition(tileX, tileY) {
  return new THREE.Vector2((tileX + (tileY % 2) * 0.5) * 1.77, tileY * 1.535);
}

function makeHex(height, pos) {
  const geo = generateGeo(height, pos);

  if (height > STONE_HEIGHT) {
    stoneGeo = mergeGeometries([geo, stoneGeo]);

    if (Math.random() > 0.8) {
      stoneGeo = mergeGeometries([stoneGeo, stone(height, pos)]);
    }
  } else if (height > DIRT_HEIGHT) {
    dirtGeo = mergeGeometries([geo, dirtGeo]);

    if (Math.random() > 0.85) {
      grassGeo = mergeGeometries([grassGeo, tree(height, pos)]);
    }
  } else if (height > GRASS_HEIGHT) {
    grassGeo = mergeGeometries([geo, grassGeo]);

    if (Math.random() > 0.8) {
      stoneGeo = mergeGeometries([stoneGeo, stone(height, pos)]);
    }
  } else if (height > SAND_HEIGHT) {
    sandGeo = mergeGeometries([geo, sandGeo]);
  } else {
    waterGeo = mergeGeometries([geo, waterGeo]);
  }
}

function hexMesh(geo, map) {
  let mat = new THREE.MeshPhysicalMaterial({
    envMap: envmap,
    envMapIntensity: 0.4,
    flatShading: true,
    map,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

function stone(height, pos) {
  const px = Math.random() * 0.4;
  const pz = Math.random() * 0.4;

  const geo = new THREE.SphereGeometry(Math.random() * 0.3 + 0.1, 7, 7);

  geo.translate(pos.x + px, height, pos.y + pz);
  return geo;
}

function tree(height, pos) {
  const treeHeight = Math.random() * 1 + 1.24;

  const geo = new THREE.CylinderGeometry(0, 1.5, treeHeight, 3);
  geo.translate(pos.x, height + treeHeight * 0.1 + 1, pos.y);

  const geo2 = new THREE.CylinderGeometry(0, 1.5, treeHeight, 3);
  geo2.translate(pos.x, height + treeHeight * 0.6 + 1, pos.y);

  const geo3 = new THREE.CylinderGeometry(0, 1.5, treeHeight, 3);
  geo3.translate(pos.x, height + treeHeight * 1.25 + 1, pos.y);

  return mergeGeometries([geo, geo2, geo3]);
}

function clouds() {
  let geo = new THREE.SphereGeometry(0, 0, 0);

  let count = Math.floor(Math.pow(Math.random(), 0.45) * 4);
  // let count = Math.floor(Math.pow(Math.random(), 2.2) * 6) + 2;

  for (let i = 0; i < count; i++) {
    const p1 = new THREE.SphereGeometry(1.2, 7, 7);
    const p2 = new THREE.SphereGeometry(1.4, 7, 7);
    const p3 = new THREE.SphereGeometry(0.9, 7, 7);

    p1.translate(-1.85, Math.random() * 0.3, 0);
    p2.translate(0, Math.random() * 0.3, 0);
    p3.translate(1.85, Math.random() * 0.3, 0);

    const cloudGeo = mergeGeometries([p1, p2, p3]);
    cloudGeo.translate(
      Math.random() * 20 - 17,
      Math.random() * 7 + 11,
      Math.random() * 20 - 10
    );
    cloudGeo.rotateY(Math.random() * Math.PI * 2);

    geo = mergeGeometries([geo, cloudGeo]);
  }

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: "white",
      envMap: envmap,
      envMapIntensity: 0.75,
      flatShading: true,
    })
  );
  scene.add(mesh);
}

// clouds();
