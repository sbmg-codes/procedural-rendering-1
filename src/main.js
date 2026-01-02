import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { js, positionGeometry, sample, saturate } from "three/src/nodes/TSL.js";

class Application {
  constructor() {
    // Remove margins
    document.body.style.margin = 0;

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100000
    );
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);
    const loader = new THREE.TextureLoader();
    this.heightMapTexture = loader.load("/perlin.png", (texture) => {
      return texture;
    });
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // Plane (10 x 10)
    this.geometry = new THREE.PlaneGeometry(10, 10, 100, 100);
    const material = new THREE.MeshBasicMaterial({
      color: "red",
      side: THREE.DoubleSide,
      wireframe: true,
    });
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);

    this.plane = new THREE.Mesh(this.geometry, material);
    this.plane.rotation.x = -Math.PI / 2;
    this.scene.add(this.plane);

    // Resize handling
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Start render loop

    this.animate();
    this.modVertsWithHeightMap();
    // this.modifyPlaneVerts();
    // this.BiLinearSample();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  modifyPlaneVerts() {
    const posArray = this.geometry.attributes.position.array;
    const pos = this.geometry.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      // const vert = posArray[i];
      const x = pos.getX(i);
      const y = pos.getY(i);

      const dist = Math.sqrt(x * x + y * y);
      console.log(dist);

      const height = THREE.MathUtils.clamp(dist / 250, 0, 1);

      pos.setZ(i, height * 2);
    }
    pos.needsUpdate = true;
  }
  modVertsWithHeightMap() {
    const pos = this.geometry.attributes.position;

    const width = 10;
    const height = 10;
    const offsetX = -width / 2;
    const offsetY = -height / 2;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);

      const xf = (x - offsetX) / width;
      const yf = (y - offsetY) / height;

      const h = this.BiLinearSample(xf, yf);

      pos.setZ(i, h * 3); // height scale
    }

    pos.needsUpdate = true;
  }

  getCenterPoint(mesh) {
    const middle = new THREE.Vector3();
    const geometry = mesh.geometry;

    geometry.computeBoundingBox();

    geometry.boundingBox.getCenter(middle);
    mesh.localToWorld(middle);
    return middle;
  }

  getPixelAsFloat(x, y) {
    const p = this.heightMapTexture.image;
    console.log(p);

    const position = (x + this.heightMapTexture.width * y) * 4;
    return this.heightMapTexture.pixels[position] / 255.0;
  }

  BiLinearSample(xf, yf) {
    const w = this.heightMapTexture.width - 1; // just for avoiding out of the bound reads
    const h = this.heightMapTexture.height - 1;

    const x = xf * w;
    const y = yf * h;

    const x1 = Math.floor(x);
    const y1 = Math.floor(y);

    const x2 = Math.min(x1 + 1, w);
    const y2 = Math.min(y1 + 1, h);

    const deltaX = x - x1;
    const deltaY = y - y1;

    const p11 = this.getPixelAsFloat(x1, y1);
    const p21 = this.getPixelAsFloat(x2, y1);
    const p12 = this.getPixelAsFloat(x1, y2);
    const p22 = this.getPixelAsFloat(x2, y2);
  }
}

new Application();
