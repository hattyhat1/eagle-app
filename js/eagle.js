// ============================================================================
//  eagle.js — The heroic bald eagle
//  Builds the model from simple primitives and handles its physics & animation:
//  gravity, flap impulse, velocity-based tilt, wing flapping, idle bob, and a
//  death tumble. The eagle stays at a fixed X while the world scrolls past.
//  Supports swappable skins (colors + accessories) via applySkin().
// ============================================================================

import * as THREE from 'three';
import { COLORS, PHYSICS, WORLD, EAGLE } from './constants.js';
import { EAGLE_SKINS } from './cosmetics.js';

export class Eagle {
  constructor(skin) {
    this.group = new THREE.Group();
    this.group.position.set(WORLD.EAGLE_X, 0, 0);

    this.velocity = 0;
    this.alive = true;
    this.flapTimer = 0;      // drives wing flap animation
    this.idlePhase = 0;      // drives idle bob
    this.tumbleSpin = 0;     // death tumble rotation

    this.mats = {};          // material refs for skinning
    this.wingMats = [];
    this.accessories = {};

    this._build();
    this.applySkin(skin || EAGLE_SKINS[0]);
  }

  // --------------------------------------------------------------------------
  //  MODEL CONSTRUCTION
  // --------------------------------------------------------------------------
  _build() {
    const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({
      color, roughness: 0.6, metalness: 0.05, flatShading: true, ...opts,
    });

    // Body — rounded form
    this.mats.body = mat(COLORS.EAGLE_BODY);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 16), this.mats.body);
    body.scale.set(1.15, 0.95, 0.9);
    body.castShadow = true;
    this.group.add(body);

    // Belly highlight
    this.mats.belly = mat(COLORS.EAGLE_BODY_DARK);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), this.mats.belly);
    belly.scale.set(1.0, 0.8, 0.85);
    belly.position.set(-0.05, -0.15, 0.12);
    this.group.add(belly);

    // Feathered head
    this.mats.head = mat(COLORS.EAGLE_HEAD);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 20, 16), this.mats.head);
    head.position.set(0.55, 0.35, 0);
    head.scale.set(1.0, 1.0, 0.95);
    head.castShadow = true;
    this.group.add(head);
    this.head = head;

    // Beak — hooked cone
    this.mats.beak = mat(COLORS.BEAK, { metalness: 0.2 });
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 12), this.mats.beak);
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(1.05, 0.28, 0);
    this.group.add(beak);
    const hook = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat(COLORS.GOLD_DEEP));
    hook.position.set(1.22, 0.18, 0);
    this.group.add(hook);

    // Eyes
    this._addEye(0.78, 0.5, 0.3);
    this._addEye(0.78, 0.5, -0.3);

    // Wings (animated)
    this.leftWing = this._buildWing(1);
    this.rightWing = this._buildWing(-1);
    this.group.add(this.leftWing, this.rightWing);

    // Tail feathers
    this.mats.accent = mat(COLORS.GOLD, { metalness: 0.4, roughness: 0.3 });
    const tail = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.12), this.mats.head);
      f.position.set(-0.85, i * 0.02, i * 0.16);
      f.rotation.z = 0.15;
      f.rotation.y = i * 0.25;
      tail.add(f);
    }
    const tailTip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.42), this.mats.accent);
    tailTip.position.set(-1.12, 0, 0);
    tail.add(tailTip);
    this.group.add(tail);

    // Legs
    [-0.18, 0.18].forEach((z) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 6), this.mats.beak);
      leg.position.set(0.1, -0.6, z);
      leg.rotation.x = 0.4;
      this.group.add(leg);
    });

    this._buildAccessories();
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
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.18), mk(COLORS.EAGLE_BODY_DARK, { roughness: 0.7 }));
    brow.position.set(x + 0.02, y + 0.14, z);
    brow.rotation.z = -0.25;
    this.group.add(brow);
  }

  _buildWing(side) {
    const wing = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.EAGLE_BODY, roughness: 0.65, flatShading: true,
    });
    const tipMat = new THREE.MeshStandardMaterial({
      color: COLORS.GOLD, roughness: 0.35, metalness: 0.4, flatShading: true,
    });
    this.wingMats.push(mat);
    if (!this.mats.wingTip) this.mats.wingTip = [];
    this.mats.wingTip.push(tipMat);

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
    wing.position.set(0.0, 0.1, 0);
    return wing;
  }

  _buildAccessories() {
    // Sunglasses (hidden unless skin.accessory === 'shades')
    const shades = new THREE.Group();
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.2, metalness: 0.5 });
    [0.3, -0.3].forEach((z) => {
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.22), lensMat);
      lens.position.set(0.92, 0.5, z);
      shades.add(lens);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.3), lensMat);
    bridge.position.set(0.92, 0.55, 0);
    shades.add(bridge);
    shades.visible = false;
    this.group.add(shades);
    this.accessories.shades = shades;

    // Star-spangled top hat (hidden unless skin.accessory === 'tophat')
    const hat = new THREE.Group();
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 16),
      new THREE.MeshStandardMaterial({ color: 0x0d1b4c, roughness: 0.5 }));
    brim.position.set(0.5, 0.85, 0);
    hat.add(brim);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.55, 16),
      new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.5 }));
    top.position.set(0.5, 1.16, 0);
    hat.add(top);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.16, 16),
      new THREE.MeshStandardMaterial({ color: 0xf7f7fb, roughness: 0.5 }));
    band.position.set(0.5, 0.95, 0);
    hat.add(band);
    hat.visible = false;
    this.group.add(hat);
    this.accessories.tophat = hat;
  }

  // --------------------------------------------------------------------------
  //  SKINS
  // --------------------------------------------------------------------------
  applySkin(skin) {
    if (!skin) return;
    this.skin = skin;
    const em = skin.emissive || 0x000000;
    const emI = skin.emissive ? 0.45 : 0;

    this.mats.body.color.setHex(skin.body);
    this.mats.body.emissive.setHex(em);
    this.mats.body.emissiveIntensity = emI;
    this.mats.belly.color.setHex(skin.bodyDark);
    this.mats.head.color.setHex(skin.head);
    this.mats.beak.color.setHex(skin.beak);
    this.mats.accent.color.setHex(skin.accent);
    for (const m of this.wingMats) {
      m.color.setHex(skin.body);
      m.emissive.setHex(em);
      m.emissiveIntensity = emI;
    }
    for (const m of (this.mats.wingTip || [])) m.color.setHex(skin.accent);

    this.accessories.shades.visible = skin.accessory === 'shades';
    this.accessories.tophat.visible = skin.accessory === 'tophat';
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
    this.flapTimer = 1;
  }

  kill() {
    this.alive = false;
    this.tumbleSpin = (Math.random() > 0.5 ? 1 : -1) * 6;
  }

  // --------------------------------------------------------------------------
  //  UPDATE LOOPS
  // --------------------------------------------------------------------------
  updateIdle(dt) {
    this.idlePhase += dt;
    this.group.position.y = Math.sin(this.idlePhase * 1.6) * 0.35;
    this.group.rotation.z = Math.sin(this.idlePhase * 1.6) * 0.06;
    const flutter = Math.sin(this.idlePhase * 4.5) * 0.35 + 0.15;
    this._setWing(flutter);
    this.group.rotation.x = Math.sin(this.idlePhase * 0.8) * 0.05;
  }

  update(dt) {
    if (this.alive) {
      this.velocity += PHYSICS.GRAVITY * dt;
      this.velocity = THREE.MathUtils.clamp(this.velocity, PHYSICS.MAX_FALL_SPEED, PHYSICS.MAX_RISE_SPEED);
      this.group.position.y += this.velocity * dt;

      const t = THREE.MathUtils.clamp(this.velocity / PHYSICS.FLAP_VELOCITY, -1, 1);
      const targetTilt = t > 0 ? PHYSICS.TILT_UP * t : PHYSICS.TILT_DOWN * -t;
      this.group.rotation.z = THREE.MathUtils.damp(
        this.group.rotation.z, targetTilt, PHYSICS.TILT_LERP, dt);

      this.flapTimer = Math.max(0, this.flapTimer - dt * 4.5);
      const wingAngle = Math.sin(this.flapTimer * Math.PI) * 1.1 - 0.1;
      this._setWing(wingAngle);
    } else {
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

  getBounds() {
    const y = this.group.position.y;
    const x = this.group.position.x;
    return {
      minX: x - EAGLE.HALF_W, maxX: x + EAGLE.HALF_W,
      minY: y - EAGLE.HALF_H, maxY: y + EAGLE.HALF_H,
    };
  }

  getTrailAnchor(out) {
    out.set(this.group.position.x - 1.0, this.group.position.y, 0);
    return out;
  }
}
