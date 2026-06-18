// ============================================================================
//  environment.js — The festive, theme-driven world
//  Sky gradient + sunburst god-rays, parallax clouds, drifting balloons,
//  stylized hills, a field with bunting + waving flags, plus per-theme extras:
//  night stars + moon, a space starfield + planets, and winter snowfall.
//  Rebuildable on the fly via setTheme() so backgrounds can be swapped in shop.
// ============================================================================

import * as THREE from 'three';
import { COLORS, WORLD, BLOOM_LAYER } from './constants.js';
import { BACKGROUNDS } from './cosmetics.js';

export class Environment {
  constructor(scene, theme) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.time = 0;
    this.clouds = [];
    this.balloons = [];
    this.flags = [];
    this.snow = null;
    this.stars = null;
    this.rays = null;

    this.setTheme(theme || BACKGROUNDS[0]);
  }

  // --------------------------------------------------------------------------
  //  THEME SWAP
  // --------------------------------------------------------------------------
  setTheme(theme) {
    this.theme = theme;
    this._clearRoot();
    this.clouds = []; this.balloons = []; this.flags = [];
    this.snow = null; this.stars = null; this.rays = null;

    this.scene.background = new THREE.Color(theme.skyBottom);
    this.scene.fog = new THREE.Fog(theme.fog, 30, 60);

    this._buildSky();
    this._buildSun();
    if (theme.space) this._buildStarfield(220);
    else this._buildHills();
    if (theme.night) { this._buildStarfield(140); this._buildMoon(); }
    this._buildGround();
    if (!theme.space) this._buildClouds();
    if (!theme.space) this._buildBalloons();
    this._buildBunting();
    this._buildFlags();
    if (theme.snow) this._buildSnow();
  }

  _clearRoot() {
    const toRemove = [...this.root.children];
    for (const obj of toRemove) {
      this.root.remove(obj);
      obj.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          for (const m of mats) { if (m.map) m.map.dispose(); m.dispose(); }
        }
      });
    }
  }

  // --------------------------------------------------------------------------
  //  PIECES
  // --------------------------------------------------------------------------
  _buildSky() {
    const t = this.theme;
    const canvas = document.createElement('canvas');
    canvas.width = 16; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, css(t.skyTop));
    grad.addColorStop(0.55, css(t.skyMid));
    grad.addColorStop(1, css(t.skyBottom));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 256);
    const tex = new THREE.CanvasTexture(canvas);
    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 80),
      new THREE.MeshBasicMaterial({ map: tex, depthWrite: false, fog: false }));
    sky.position.set(0, 2, -30);
    this.root.add(sky);
  }

  _buildSun() {
    const t = this.theme;
    const sunGroup = new THREE.Group();
    sunGroup.position.set(7, 6, -24);

    // The sun has its own halo + god-rays; keeping it OUT of the bloom pass
    // prevents the whole screen from washing out.
    const sun = new THREE.Mesh(new THREE.CircleGeometry(3.4, 48),
      new THREE.MeshBasicMaterial({ color: t.sun, fog: false }));
    sunGroup.add(sun);

    const glow = new THREE.Mesh(new THREE.CircleGeometry(5.2, 48),
      new THREE.MeshBasicMaterial({ color: t.glow, transparent: true, opacity: 0.4, depthWrite: false, fog: false }));
    glow.position.z = -0.5;
    sunGroup.add(glow);

    const rayOpacity = (t.night || t.space) ? 0.08 : 0.22;
    this.rays = new THREE.Group();
    const rayMat = new THREE.MeshBasicMaterial({
      color: t.glow, transparent: true, opacity: rayOpacity, depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    for (let i = 0; i < 12; i++) {
      const ray = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 26), rayMat);
      ray.position.z = -1;
      ray.rotation.z = (i / 12) * Math.PI * 2;
      ray.geometry.translate(0, 8, 0);
      this.rays.add(ray);
    }
    sunGroup.add(this.rays);
    this.root.add(sunGroup);
  }

  _buildHills() {
    const t = this.theme;
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
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape),
        new THREE.MeshBasicMaterial({ color, fog: false }));
      mesh.position.set(0, y, z);
      this.root.add(mesh);
    };
    mk(t.hillFar, -22, 2.5, -3);
    mk(t.hill, -19, 1.8, -4.5);
  }

  _buildGround() {
    const t = this.theme;
    const ground = new THREE.Mesh(new THREE.BoxGeometry(120, 4, 24),
      new THREE.MeshStandardMaterial({ color: t.ground, roughness: 0.9 }));
    ground.position.set(0, WORLD.GROUND_VISUAL_Y, -2);
    ground.receiveShadow = true;
    this.root.add(ground);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(120, 0.4, 24.2),
      new THREE.MeshStandardMaterial({ color: t.groundDark, roughness: 1 }));
    strip.position.set(0, WORLD.GROUND_Y - 0.2, -2);
    this.root.add(strip);
  }

  _buildClouds() {
    const dim = this.theme.night ? 0xc7d2f0 : 0xffffff;
    const mkCloud = (x, y, z, scale) => {
      const cloud = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: dim, roughness: 1, flatShading: true });
      const parts = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < parts; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.7 + Math.random() * 0.5, 10, 8), mat);
        s.position.set((i - parts / 2) * 0.7, Math.random() * 0.3, Math.random() * 0.3);
        s.scale.setScalar(0.8 + Math.random() * 0.5);
        cloud.add(s);
      }
      cloud.position.set(x, y, z);
      cloud.scale.setScalar(scale);
      cloud.userData = { speed: 0.3 + Math.random() * 0.5 };
      this.root.add(cloud);
      this.clouds.push(cloud);
    };
    for (let i = 0; i < 4; i++) mkCloud((Math.random() - 0.5) * 50, 4 + Math.random() * 4, -16, 1.1);
    for (let i = 0; i < 4; i++) mkCloud((Math.random() - 0.5) * 50, 3 + Math.random() * 5, -10, 1.5);
  }

  _buildBalloons() {
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Group();
      const colors = [COLORS.RED, COLORS.WHITE, COLORS.BLUE];
      for (let s = 0; s < 6; s++) {
        const wedge = new THREE.Mesh(
          new THREE.SphereGeometry(1.1, 12, 12, (s / 6) * Math.PI * 2, Math.PI / 3),
          new THREE.MeshStandardMaterial({ color: colors[s % 3], roughness: 0.5, flatShading: true }));
        b.add(wedge);
      }
      const basket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x8a5a2b }));
      basket.position.y = -1.6;
      b.add(basket);
      b.position.set((Math.random() - 0.5) * 40, 4 + Math.random() * 4, -14 - Math.random() * 4);
      b.scale.setScalar(0.9 + Math.random() * 0.5);
      b.userData = { speed: 0.25 + Math.random() * 0.3, bob: Math.random() * 10 };
      this.root.add(b);
      this.balloons.push(b);
    }
  }

  _buildBunting() {
    const colors = [COLORS.RED, COLORS.WHITE, COLORS.BLUE];
    for (let i = 0; i < 24; i++) {
      const x = -34 + i * 3;
      const swag = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 12, 8, 0, Math.PI),
        new THREE.MeshStandardMaterial({ color: colors[i % 3], roughness: 0.7, side: THREE.DoubleSide }));
      swag.scale.set(1, 0.6, 0.4);
      swag.rotation.x = Math.PI / 2;
      swag.position.set(x, WORLD.GROUND_Y - 0.2, 7.5);
      this.root.add(swag);
    }
  }

  _buildFlags() {
    // Wider spacing -> fewer flags -> fewer per-frame cloth updates.
    for (let x = -28, idx = 0; x <= 28; x += 8, idx++) {
      const flag = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6),
        new THREE.MeshStandardMaterial({ color: COLORS.GOLD_DEEP, metalness: 0.4 }));
      pole.position.y = WORLD.GROUND_Y + 1;
      flag.add(pole);
      const cloth = this._makeFlagCloth();
      cloth.position.set(0, WORLD.GROUND_Y + 1.7, 0);
      flag.add(cloth);
      flag.userData = { cloth, phase: idx };
      flag.position.set(x, 0, 8);
      this.root.add(flag);
      this.flags.push(flag);
    }
  }

  _makeFlagCloth() {
    const geo = new THREE.PlaneGeometry(1.4, 0.9, 8, 1);
    geo.translate(0.7, 0, 0);
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
      for (let c = 0; c < 4; c++) { ctx.beginPath(); ctx.arc(6 + c * 9, 6 + r * 9, 2, 0, Math.PI * 2); ctx.fill(); }
    const tex = new THREE.CanvasTexture(canvas);
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 }));
  }

  _buildStarfield(count) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = Math.random() * 26 - 2;
      positions[i * 3 + 2] = -26 + Math.random() * 6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.28, sizeAttenuation: true, transparent: true, opacity: 0.95, fog: false,
    }));
    stars.layers.enable(BLOOM_LAYER); // stars twinkle/glow
    this.stars = stars;
    this.root.add(stars);
  }

  _buildMoon() {
    const moon = new THREE.Mesh(new THREE.CircleGeometry(2.2, 40),
      new THREE.MeshBasicMaterial({ color: 0xfdf6d0, fog: false }));
    moon.position.set(-8, 9, -25);
    this.root.add(moon);
  }

  _buildSnow() {
    const count = 300;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 24 - 7;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.snow = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.22, transparent: true, opacity: 0.9, sizeAttenuation: true, fog: false,
    }));
    this.root.add(this.snow);
  }

  // --------------------------------------------------------------------------
  //  UPDATE
  // --------------------------------------------------------------------------
  update(dt) {
    this.time += dt;
    this._frame = (this._frame || 0) + 1;
    const heavyTick = this._frame % 2 === 0; // cloth/snow updates every other frame

    for (const c of this.clouds) {
      c.position.x -= c.userData.speed * dt;
      if (c.position.x < -28) c.position.x = 28;
    }
    for (const b of this.balloons) {
      b.position.x -= b.userData.speed * dt;
      b.position.y += Math.sin(this.time + b.userData.bob) * 0.003;
      if (b.position.x < -24) b.position.x = 24;
    }
    if (this.rays) this.rays.rotation.z += dt * 0.05;
    if (this.stars) this.stars.material.opacity = 0.7 + Math.sin(this.time * 2) * 0.25;

    if (this.snow && heavyTick) {
      const p = this.snow.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) - dt * 2.8;
        let x = p.getX(i) - dt * 1.2;
        if (y < -7) { y = 17; x = (Math.random() - 0.5) * 40; }
        p.setY(i, y); p.setX(i, x);
      }
      p.needsUpdate = true;
    }

    if (heavyTick) {
      for (const f of this.flags) {
        const pos = f.userData.cloth.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          pos.setZ(i, Math.sin((x + this.time * 3 + f.userData.phase) * 2.5) * 0.12 * Math.max(0, x));
        }
        pos.needsUpdate = true;
      }
    }
  }
}

const css = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
