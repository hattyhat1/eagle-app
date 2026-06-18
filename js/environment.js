// ============================================================================
//  environment.js — The festive, star-spangled world
//  Sky gradient + sunburst god-rays, parallax clouds, drifting hot-air
//  balloons / blimp, stylized amber hills, a green field, and animated
//  stars-and-stripes bunting + waving flags along the edges.
//  Background spectacle only — never overlaps the play lane.
// ============================================================================

import * as THREE from 'three';
import { COLORS, WORLD, SPECTACLE } from './constants.js';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.clouds = [];
    this.balloons = [];
    this.flags = [];
    this.time = 0;

    this._buildSky();
    this._buildSun();
    this._buildHills();
    this._buildGround();
    this._buildClouds();
    this._buildBalloons();
    this._buildBunting();
    this._buildFlags();
  }

  _buildSky() {
    // Large gradient backdrop plane behind everything.
    const geo = new THREE.PlaneGeometry(120, 80);
    const canvas = document.createElement('canvas');
    canvas.width = 16; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#3da4ff');
    grad.addColorStop(0.55, '#79c6ff');
    grad.addColorStop(1, '#cfeeff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 256);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, depthWrite: false });
    const sky = new THREE.Mesh(geo, mat);
    sky.position.set(0, 2, -30);
    this.scene.add(sky);
  }

  _buildSun() {
    const sunGroup = new THREE.Group();
    sunGroup.position.set(7, 6, -24);

    const sun = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 48),
      new THREE.MeshBasicMaterial({ color: COLORS.SUN }));
    sunGroup.add(sun);

    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(5.2, 48),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.4, depthWrite: false }));
    glow.position.z = -0.5;
    sunGroup.add(glow);

    // God-rays / sunburst spokes
    if (SPECTACLE.godRays) {
      this.rays = new THREE.Group();
      const rayMat = new THREE.MeshBasicMaterial({
        color: 0xfff0b8, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide,
      });
      for (let i = 0; i < 12; i++) {
        const ray = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 26), rayMat);
        ray.position.z = -1;
        ray.rotation.z = (i / 12) * Math.PI * 2;
        ray.geometry.translate(0, 8, 0);
        this.rays.add(ray);
      }
      sunGroup.add(this.rays);
    }
    this.scene.add(sunGroup);
    this.sun = sunGroup;
  }

  _buildHills() {
    const mk = (color, z, scaleY, y) => {
      const shape = new THREE.Shape();
      const w = 70;
      shape.moveTo(-w, -10);
      let x = -w;
      while (x <= w) {
        const h = (Math.sin(x * 0.12) * 0.5 + Math.sin(x * 0.05 + 2) * 0.5 + 1) * scaleY;
        shape.lineTo(x, h);
        x += 2;
      }
      shape.lineTo(w, -10);
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, y, z);
      this.scene.add(mesh);
    };
    mk(COLORS.HILL_FAR, -22, 2.5, -3);
    mk(COLORS.HILL, -19, 1.8, -4.5);
  }

  _buildGround() {
    const groundMat = new THREE.MeshStandardMaterial({ color: COLORS.GROUND, roughness: 0.9 });
    const ground = new THREE.Mesh(new THREE.BoxGeometry(120, 4, 24), groundMat);
    ground.position.set(0, WORLD.GROUND_VISUAL_Y, -2);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Darker top strip for a stylized field edge.
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(120, 0.4, 24.2),
      new THREE.MeshStandardMaterial({ color: COLORS.GROUND_DARK, roughness: 1 }));
    strip.position.set(0, WORLD.GROUND_Y - 0.2, -2);
    this.scene.add(strip);
  }

  _buildClouds() {
    const mkCloud = (x, y, z, scale) => {
      const cloud = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
      const parts = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < parts; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.7 + Math.random() * 0.5, 10, 8), mat);
        s.position.set((i - parts / 2) * 0.7, Math.random() * 0.3, Math.random() * 0.3);
        s.scale.setScalar(0.8 + Math.random() * 0.5);
        cloud.add(s);
      }
      cloud.position.set(x, y, z);
      cloud.scale.setScalar(scale);
      cloud.userData = { speed: 0.3 + Math.random() * 0.5, z };
      this.scene.add(cloud);
      this.clouds.push(cloud);
    };
    // Far layer (slow) and mid layer (faster) for parallax.
    for (let i = 0; i < 5; i++) mkCloud((Math.random() - 0.5) * 50, 4 + Math.random() * 4, -16, 1.1);
    for (let i = 0; i < 5; i++) mkCloud((Math.random() - 0.5) * 50, 3 + Math.random() * 5, -10, 1.5);
  }

  _buildBalloons() {
    const count = SPECTACLE.balloons;
    for (let i = 0; i < count; i++) {
      const b = new THREE.Group();
      // Striped red/white/blue balloon envelope
      const colors = [COLORS.RED, COLORS.WHITE, COLORS.BLUE];
      for (let s = 0; s < 6; s++) {
        const wedge = new THREE.Mesh(
          new THREE.SphereGeometry(1.1, 12, 12, (s / 6) * Math.PI * 2, Math.PI / 3),
          new THREE.MeshStandardMaterial({ color: colors[s % 3], roughness: 0.5, flatShading: true }));
        b.add(wedge);
      }
      const basket = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.4, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x8a5a2b }));
      basket.position.y = -1.6;
      b.add(basket);
      b.position.set((Math.random() - 0.5) * 40, 4 + Math.random() * 4, -14 - Math.random() * 4);
      b.scale.setScalar(0.9 + Math.random() * 0.5);
      b.userData = { speed: 0.25 + Math.random() * 0.3, bob: Math.random() * 10 };
      this.scene.add(b);
      this.balloons.push(b);
    }
  }

  // Stars-and-stripes bunting swag along the top of the ground.
  _buildBunting() {
    const group = new THREE.Group();
    const swagCount = 24;
    const colors = [COLORS.RED, COLORS.WHITE, COLORS.BLUE];
    for (let i = 0; i < swagCount; i++) {
      const x = -34 + i * 3;
      const swag = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 12, 8, 0, Math.PI),
        new THREE.MeshStandardMaterial({ color: colors[i % 3], roughness: 0.7, side: THREE.DoubleSide }));
      swag.scale.set(1, 0.6, 0.4);
      swag.rotation.x = Math.PI / 2;
      swag.position.set(x, WORLD.GROUND_Y - 0.2, 7.5);
      group.add(swag);
    }
    this.scene.add(group);
  }

  // Small waving cloth flags along the field edge (front, off the play lane).
  _buildFlags() {
    const positions = [];
    for (let x = -30; x <= 30; x += 5) positions.push(x);
    positions.forEach((x, idx) => {
      const flag = new THREE.Group();
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6),
        new THREE.MeshStandardMaterial({ color: COLORS.GOLD_DEEP, metalness: 0.4 }));
      pole.position.y = WORLD.GROUND_Y + 1;
      flag.add(pole);

      const cloth = this._makeFlagCloth();
      cloth.position.set(0.7, WORLD.GROUND_Y + 1.7, 0);
      flag.add(cloth);
      flag.userData = { cloth, phase: idx };

      flag.position.set(x, 0, 8);
      this.scene.add(flag);
      this.flags.push(flag);
    });
  }

  _makeFlagCloth() {
    // Segmented plane so it can ripple.
    const geo = new THREE.PlaneGeometry(1.4, 0.9, 8, 1);
    const canvas = document.createElement('canvas');
    canvas.width = 96; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const stripeH = 64 / 7;
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#c8102e' : '#f7f7fb';
      ctx.fillRect(0, i * stripeH, 96, stripeH + 1);
    }
    ctx.fillStyle = '#16307a';
    ctx.fillRect(0, 0, 40, stripeH * 4);
    ctx.fillStyle = '#ffffff';
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++) {
        ctx.beginPath();
        ctx.arc(6 + c * 9, 6 + r * 9, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.geometry.translate(0.7, 0, 0); // pivot at pole
    return mesh;
  }

  update(dt) {
    this.time += dt;

    // Parallax cloud drift; wrap around.
    for (const c of this.clouds) {
      c.position.x -= c.userData.speed * dt;
      if (c.position.x < -28) c.position.x = 28;
    }
    for (const b of this.balloons) {
      b.position.x -= b.userData.speed * dt;
      b.position.y += Math.sin(this.time + b.userData.bob) * 0.003;
      if (b.position.x < -24) b.position.x = 24;
    }

    // Slow shimmering god-rays.
    if (this.rays) this.rays.rotation.z += dt * 0.05;

    // Waving flags.
    for (const f of this.flags) {
      const cloth = f.userData.cloth;
      const pos = cloth.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setZ(i, Math.sin((x + this.time * 3 + f.userData.phase) * 2.5) * 0.12 * Math.max(0, x));
      }
      pos.needsUpdate = true;
    }
  }
}
