// ============================================================================
//  eagle.js — The heroic bald eagle
//  Builds the model from simple primitives and handles its physics & animation:
//  gravity, flap impulse, velocity-based tilt, wing flapping, idle bob, and a
//  death tumble. The eagle stays at a fixed X while the world scrolls past.
// ============================================================================

import * as THREE from 'three';
import { COLORS, PHYSICS, WORLD, EAGLE } from './constants.js';

export class Eagle {
  constructor() {
    this.group = new THREE.Group();
    this.group.position.set(WORLD.EAGLE_X, 0, 0);

    this.velocity = 0;
    this.alive = true;
    this.flapTimer = 0;      // drives wing flap animation
    this.idlePhase = 0;      // drives idle bob
    this.tumbleSpin = 0;     // death tumble rotation

    this._build();
  }

  // --------------------------------------------------------------------------
  //  MODEL CONSTRUCTION
  // --------------------------------------------------------------------------
  _build() {
    const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({
      color, roughness: 0.6, metalness: 0.05, flatShading: true, ...opts,
    });

    // Body — dark brown rounded form
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 16), mat(COLORS.EAGLE_BODY));
    body.scale.set(1.15, 0.95, 0.9);
    body.castShadow = true;
    this.group.add(body);

    // Belly highlight
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), mat(COLORS.EAGLE_BODY_DARK));
    belly.scale.set(1.0, 0.8, 0.85);
    belly.position.set(-0.05, -0.15, 0.12);
    this.group.add(belly);

    // White feathered head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 20, 16), mat(COLORS.EAGLE_HEAD));
    head.position.set(0.55, 0.35, 0);
    head.scale.set(1.0, 1.0, 0.95);
    head.castShadow = true;
    this.group.add(head);
    this.head = head;

    // Beak — yellow/orange hooked cone
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 12), mat(COLORS.BEAK, { metalness: 0.2 }));
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(1.05, 0.28, 0);
    this.group.add(beak);
    // Hooked tip
    const hook = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat(COLORS.GOLD_DEEP));
    hook.position.set(1.22, 0.18, 0);
    this.group.add(hook);

    // Eyes — white with black pupils, glint, friendly brow
    this._addEye(0.78, 0.5, 0.3);
    this._addEye(0.78, 0.5, -0.3);

    // Broad wings (animated)
    this.leftWing = this._buildWing(1);
    this.rightWing = this._buildWing(-1);
    this.group.add(this.leftWing, this.rightWing);

    // White tail feathers
    const tail = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.12), mat(COLORS.WHITE));
      f.position.set(-0.85, i * 0.02, i * 0.16);
      f.rotation.z = 0.15;
      f.rotation.y = i * 0.25;
      tail.add(f);
    }
    // Gold-tipped accent
    const tailTip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.42), mat(COLORS.GOLD, { metalness: 0.4, roughness: 0.3 }));
    tailTip.position.set(-1.12, 0, 0);
    tail.add(tailTip);
    this.group.add(tail);

    // Little legs/talons tucked under
    [-0.18, 0.18].forEach((z) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 6), mat(COLORS.BEAK));
      leg.position.set(0.1, -0.6, z);
      leg.rotation.x = 0.4;
      this.group.add(leg);
    });
  }

  _addEye(x, y, z) {
    const mk = (color, opts) => new THREE.MeshStandardMaterial({ color, ...opts });
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), mk(0xffffff, { roughness: 0.3 }));
    white.position.set(x, y, z);
    this.group.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mk(COLORS.PUPIL, { roughness: 0.2 }));
    pupil.position.set(x + 0.08, y, z);
    this.group.add(pupil);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), mk(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.8 }));
    glint.position.set(x + 0.12, y + 0.04, z + 0.03);
    this.group.add(glint);
    // Friendly brow
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.18), mk(COLORS.EAGLE_BODY_DARK, { roughness: 0.7 }));
    brow.position.set(x + 0.02, y + 0.14, z);
    brow.rotation.z = z > 0 ? -0.25 : -0.25;
    this.group.add(brow);
  }

  _buildWing(side) {
    // side: +1 = left (far), -1 = right (near)
    const wing = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.EAGLE_BODY, roughness: 0.65, flatShading: true,
    });
    const tipMat = new THREE.MeshStandardMaterial({
      color: COLORS.GOLD, roughness: 0.35, metalness: 0.4, flatShading: true,
    });
    const main = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 0.8), mat);
    main.position.set(-0.1, 0, side * 0.7);
    main.castShadow = true;
    wing.add(main);
    const outer = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.5), mat);
    outer.position.set(-0.35, 0, side * 1.25);
    wing.add(outer);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.3), tipMat);
    tip.position.set(-0.55, 0, side * 1.6);
    wing.add(tip);
    // Pivot near the body so it rotates like a shoulder
    wing.position.set(0.0, 0.1, 0);
    wing.userData.side = side;
    return wing;
  }

  // --------------------------------------------------------------------------
  //  STATE
  // --------------------------------------------------------------------------
  reset() {
    this.velocity = 0;
    this.alive = true;
    this.flapTimer = 0;
    this.tumbleSpin = 0;
    this.group.position.set(WORLD.EAGLE_X, 0, 0);
    this.group.rotation.set(0, 0, 0);
  }

  flap() {
    if (!this.alive) return;
    this.velocity = PHYSICS.FLAP_VELOCITY;
    this.flapTimer = 1; // trigger a wing-down stroke
  }

  kill() {
    this.alive = false;
    this.tumbleSpin = (Math.random() > 0.5 ? 1 : -1) * 6;
  }

  // --------------------------------------------------------------------------
  //  UPDATE LOOPS
  // --------------------------------------------------------------------------

  // Idle hover for the menu — gentle bob & slow wing flutter.
  updateIdle(dt) {
    this.idlePhase += dt;
    this.group.position.y = Math.sin(this.idlePhase * 1.6) * 0.35;
    this.group.rotation.z = Math.sin(this.idlePhase * 1.6) * 0.06;
    const flutter = Math.sin(this.idlePhase * 4.5) * 0.35 + 0.15;
    this._setWing(flutter);
    this.group.rotation.x = Math.sin(this.idlePhase * 0.8) * 0.05;
  }

  // Active flight physics.
  update(dt) {
    if (this.alive) {
      this.velocity += PHYSICS.GRAVITY * dt;
      this.velocity = THREE.MathUtils.clamp(this.velocity, PHYSICS.MAX_FALL_SPEED, PHYSICS.MAX_RISE_SPEED);
      this.group.position.y += this.velocity * dt;

      // Tilt: up when rising, down when diving — smoothly interpolated.
      const t = THREE.MathUtils.clamp(this.velocity / PHYSICS.FLAP_VELOCITY, -1, 1);
      const targetTilt = t > 0 ? PHYSICS.TILT_UP * t : PHYSICS.TILT_DOWN * -t;
      this.group.rotation.z = THREE.MathUtils.damp(
        this.group.rotation.z, targetTilt, PHYSICS.TILT_LERP, dt);

      // Wing flap animation decays after each flap.
      this.flapTimer = Math.max(0, this.flapTimer - dt * 4.5);
      const wingAngle = Math.sin(this.flapTimer * Math.PI) * 1.1 - 0.1;
      this._setWing(wingAngle);
    } else {
      // Death tumble: keep falling, ruffle, and spin.
      this.velocity += PHYSICS.GRAVITY * dt;
      this.group.position.y += this.velocity * dt;
      this.group.position.y = Math.max(this.group.position.y, WORLD.GROUND_Y - 0.5);
      this.group.rotation.z += this.tumbleSpin * dt;
      this.group.rotation.x += this.tumbleSpin * 0.5 * dt;
      this._setWing(Math.sin(performance.now() * 0.03) * 0.8);
    }
  }

  _setWing(angle) {
    if (this.leftWing) this.leftWing.rotation.x = angle;
    if (this.rightWing) this.rightWing.rotation.x = -angle;
  }

  // Axis-aligned collision box (slightly forgiving).
  getBounds() {
    const y = this.group.position.y;
    const x = this.group.position.x;
    return {
      minX: x - EAGLE.HALF_W, maxX: x + EAGLE.HALF_W,
      minY: y - EAGLE.HALF_H, maxY: y + EAGLE.HALF_H,
    };
  }

  // World-space tip position (for the trail emitter).
  getTrailAnchor(out) {
    out.set(this.group.position.x - 1.0, this.group.position.y, 0);
    return out;
  }
}
