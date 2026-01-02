import * as THREE from "three";

class ParticleSystem {
  constructor(params) {
    const uniforms = {
      diffuseTexture: {
        value: new THREE.TextureLoader().load("/fire.png"),
      },

      pointMultiplier: {
        value:
          window.innerHeight / (2.0 * Math.tan((0.5 * 60 * Math.PI) / 180)),
      },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: _VS,
      fragmentShader: _FS,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
    });

    this.camera = params.camera;
    this.particles = [];

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([], 3)
    );

    this.points = new THREE.Points(this.geometry, this.material);
  }

  addParticles() {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        pos: new THREE.Vector3(
          Math.random() * 2 - 1 * 0,
          Math.random() * 2 - 1 * 0,
          Math.random() * 2 - 1 * 0
        ),
      });
    }
  }
}
