// ============================================================================
//  particles.js — Reusable particle systems for the spectacle layer
//  Fireworks (milestones / new record), confetti cannon, score star-burst,
//  flap puff, collision feathers+stars, and the eagle's red/white/blue trail.
//  Everything is pooled to stay smooth on mobile.
// ============================================================================

import * as THREE from 'three';
import { COLORS, SPECTACLE, BLOOM_LAYER } from './constants.js';
import { TRAILS } from './cosmetics.js';

const RWB = [COLORS.RED, COLORS.WHITE, COLORS.BLUE, COLORS.GOLD];

// A single pooled particle.
class P {
  constructor(mesh) {
    this.mesh = mesh;
    this.vel = new THREE.Vector3();
    this.life = 0;
    this.maxLife = 1;
    this.gravity = 0;
    this.spin = new THREE.Vector3();
    this.fade = true;
    this.active = false;
  }
}

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.container = new THREE.Group();
    scene.add(this.container);
    this.pool = [];
    this.active = [];

    // Pre-build geometries we reuse.
    this._starGeo = this._makeStarGeometry();
    this._sphereGeo = new THREE.SphereGeometry(0.12, 8, 6);
    this._confettiGeo = new THREE.PlaneGeometry(0.18, 0.28);
    this._featherGeo = new THREE.BoxGeometry(0.28, 0.08, 0.04);
    this._stripeGeo = new THREE.PlaneGeometry(0.3, 0.12);

    this.trailStyle = TRAILS[0];
  }

  setTrailStyle(trail) { this.trailStyle = trail || TRAILS[0]; }

  _makeStarGeometry() {
    const shape = new THREE.Shape();
    const spikes = 5, outer = 0.18, inner = 0.08;
    let rot = -Math.PI / 2;
    const step = Math.PI / spikes;
    shape.moveTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
    for (let i = 0; i < spikes; i++) {
      rot += step;
      shape.lineTo(Math.cos(rot) * inner, Math.sin(rot) * inner);
      rot += step;
      shape.lineTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
    }
    return new THREE.ShapeGeometry(shape);
  }

  _acquire(geo, color) {
    let p = this.pool.pop();
    if (!p) {
      const mat = new THREE.MeshBasicMaterial({
        transparent: true, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.layers.enable(BLOOM_LAYER); // particles glow
      p = new P(mesh);
    }
    p.mesh.geometry = geo;
    p.mesh.material.color.setHex(color);
    p.mesh.material.opacity = 1;
    p.mesh.visible = true;
    p.mesh.scale.set(1, 1, 1);
    p.active = true;
    this.container.add(p.mesh);
    this.active.push(p);
    return p;
  }

  _release(p) {
    p.active = false;
    p.mesh.visible = false;
    this.container.remove(p.mesh);
    this.pool.push(p);
  }

  // --- Effects ---------------------------------------------------------------

  // Bright red/white/blue star burst when scoring.
  scoreBurst(pos) {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const p = this._acquire(this._starGeo, RWB[i % RWB.length]);
      p.mesh.position.copy(pos);
      const a = (i / n) * Math.PI * 2;
      const sp = 3 + Math.random() * 2;
      p.vel.set(Math.cos(a) * sp, Math.sin(a) * sp + 1, (Math.random() - 0.5) * 2);
      p.gravity = -4;
      p.spin.set(0, 0, (Math.random() - 0.5) * 12);
      p.life = 0; p.maxLife = 0.7; p.fade = true;
      p.mesh.scale.setScalar(0.8 + Math.random() * 0.6);
    }
  }

  // Small feather/air puff on flap.
  flapPuff(pos) {
    if (!SPECTACLE.trail && Math.random() > 0.5) return;
    for (let i = 0; i < 3; i++) {
      const p = this._acquire(this._featherGeo, i === 0 ? COLORS.WHITE : COLORS.EAGLE_BODY);
      p.mesh.position.copy(pos);
      p.mesh.position.y += (Math.random() - 0.5) * 0.3;
      p.vel.set(-2 - Math.random() * 2, -0.5 - Math.random(), (Math.random() - 0.5) * 1.5);
      p.gravity = -3;
      p.spin.set((Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10);
      p.life = 0; p.maxLife = 0.5; p.fade = true;
    }
  }

  // Collision: puff + red/white/blue feathers and stars.
  collisionBurst(pos) {
    for (let i = 0; i < 16; i++) {
      const useStar = i % 3 === 0;
      const p = this._acquire(useStar ? this._starGeo : this._featherGeo, RWB[i % RWB.length]);
      p.mesh.position.copy(pos);
      const a = Math.random() * Math.PI * 2;
      const sp = 3 + Math.random() * 5;
      p.vel.set(Math.cos(a) * sp, Math.sin(a) * sp + 2, (Math.random() - 0.5) * 3);
      p.gravity = -9;
      p.spin.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16);
      p.life = 0; p.maxLife = 1.0; p.fade = true;
    }
    // White puff
    for (let i = 0; i < 6; i++) {
      const p = this._acquire(this._sphereGeo, COLORS.WHITE);
      p.mesh.position.copy(pos);
      const a = Math.random() * Math.PI * 2;
      p.vel.set(Math.cos(a) * 2, Math.sin(a) * 2, 0);
      p.gravity = 0;
      p.life = 0; p.maxLife = 0.4; p.fade = true;
      p.mesh.scale.setScalar(1.5);
    }
  }

  // Streamer trail behind the eagle — styled by the equipped trail cosmetic.
  trail(pos) {
    if (!SPECTACLE.trail) return;
    const style = this.trailStyle;
    const colors = style.colors;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const geo = style.shape === 'star' ? this._starGeo
      : style.shape === 'stripe' ? this._stripeGeo : this._sphereGeo;
    const p = this._acquire(geo, color);
    p.mesh.position.copy(pos);
    p.mesh.position.z = (Math.random() - 0.5) * 0.6;
    p.vel.set(-1.5, (Math.random() - 0.5) * 0.6, 0);
    p.gravity = 0;
    p.spin.set(0, 0, style.shape !== 'sphere' ? (Math.random() - 0.5) * 6 : 0);
    p.life = 0; p.maxLife = 0.6; p.fade = true;
    p.mesh.scale.setScalar(0.5 + Math.random() * 0.4);
  }

  // Sparkle burst when collecting a coin.
  coinPickup(pos) {
    for (let i = 0; i < 7; i++) {
      const p = this._acquire(this._starGeo, i % 2 ? COLORS.GOLD : 0xfff2b0);
      p.mesh.position.copy(pos);
      const a = (i / 7) * Math.PI * 2;
      const sp = 2 + Math.random() * 2;
      p.vel.set(Math.cos(a) * sp, Math.sin(a) * sp + 1.5, 0);
      p.gravity = -5;
      p.spin.set(0, 0, (Math.random() - 0.5) * 14);
      p.life = 0; p.maxLife = 0.5; p.fade = true;
      p.mesh.scale.setScalar(0.6 + Math.random() * 0.4);
    }
  }

  // Firework shell explosion at pos.
  firework(pos, color) {
    const count = Math.floor(26 * SPECTACLE.fireworks);
    const c = color != null ? color : RWB[Math.floor(Math.random() * 3)];
    for (let i = 0; i < count; i++) {
      const p = this._acquire(this._sphereGeo, c);
      p.mesh.position.copy(pos);
      // Spherical-ish spread (flattened slightly toward camera plane).
      const a = Math.random() * Math.PI * 2;
      const r = 4 + Math.random() * 3;
      p.vel.set(Math.cos(a) * r, Math.sin(a) * r, (Math.random() - 0.5) * 2.5);
      p.gravity = -3.5;
      p.life = 0; p.maxLife = 1.1 + Math.random() * 0.5; p.fade = true;
      p.mesh.scale.setScalar(0.7 + Math.random() * 0.5);
    }
  }

  // A volley of fireworks across the sky.
  fireworksShow(count = 5) {
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.4) * 16;
      const y = 2 + Math.random() * 5;
      setTimeout(() => this.firework(new THREE.Vector3(x, y, -2), RWB[i % 3]),
        i * 220 + Math.random() * 100);
    }
  }

  // Confetti cannon for new records — bursts from bottom corners upward.
  confettiCannon() {
    const total = Math.floor(80 * SPECTACLE.confetti);
    for (let i = 0; i < total; i++) {
      const fromLeft = i % 2 === 0;
      const p = this._acquire(this._confettiGeo, RWB[i % RWB.length]);
      p.mesh.position.set(fromLeft ? -10 : 10, -6, (Math.random() - 0.5) * 4);
      const up = 9 + Math.random() * 5;
      p.vel.set((fromLeft ? 1 : -1) * (3 + Math.random() * 4), up, (Math.random() - 0.5) * 3);
      p.gravity = -9;
      p.spin.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
      p.life = 0; p.maxLife = 2.2 + Math.random(); p.fade = true;
    }
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this._release(p);
        this.active.splice(i, 1);
        continue;
      }
      p.vel.y += p.gravity * dt;
      p.mesh.position.x += p.vel.x * dt;
      p.mesh.position.y += p.vel.y * dt;
      p.mesh.position.z += p.vel.z * dt;
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      p.mesh.rotation.z += p.spin.z * dt;
      if (p.fade) {
        p.mesh.material.opacity = 1 - (p.life / p.maxLife);
      }
    }
  }

  clear() {
    for (let i = this.active.length - 1; i >= 0; i--) {
      this._release(this.active[i]);
    }
    this.active.length = 0;
  }
}
