// ============================================================================
//  coins.js — CoinManager
//  Spawns golden star-coins in arcs through the pillar gaps. Coins drift left
//  with the world, gently spin/bob, and are collected when the eagle overlaps
//  them (with a small magnet assist so pickups feel generous). Pooled.
// ============================================================================

import * as THREE from 'three';
import { WORLD, BLOOM_LAYER } from './constants.js';
import { COIN_SKINS } from './cosmetics.js';

const COIN_VALUE = 5;        // coins awarded per pickup (1 coin/pillar now)
const COIN_RADIUS = 0.42;
const PICKUP_RADIUS = 0.95;  // generous collection range
const MAGNET_RANGE = 2.4;    // coins drift toward a nearby eagle

export class CoinManager {
  constructor(scene, skin) {
    this.scene = scene;
    this.coins = [];
    this.pool = [];
    this.onCollect = null;     // callback(value, position)
    this.shape = 'coin';

    this.discGeo = new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, 0.1, 20);
    this.gemGeo = new THREE.OctahedronGeometry(COIN_RADIUS * 1.05, 0);
    this.starGeo = this._starGeo();
    this.mat = new THREE.MeshStandardMaterial({ metalness: 0.5, roughness: 0.2 });
    this.starMat = new THREE.MeshStandardMaterial({ metalness: 0.4, roughness: 0.25 });

    this.applySkin(skin || COIN_SKINS[0]);
  }

  // Recolour/reshape the collectible. Rebuilds the pool so the new look
  // (especially gem vs coin shape) takes effect on the next coins.
  applySkin(skin) {
    this.skin = skin;
    this.shape = skin.shape;
    this.mat.color.setHex(skin.disc);
    this.mat.emissive.setHex(skin.discEm || 0x000000);
    this.mat.emissiveIntensity = 0.3;
    this.mat.metalness = skin.shape === 'gem' ? 0.1 : 0.5;
    this.mat.roughness = skin.shape === 'gem' ? 0.1 : 0.2;
    this.starMat.color.setHex(skin.star || 0xffffff);
    this.starMat.emissive.setHex(skin.starEm || 0x000000);
    this.starMat.emissiveIntensity = 0.35;
    // Drop pooled meshes so they rebuild with the right shape.
    for (const c of this.pool) this.scene.remove(c.group);
    this.pool.length = 0;
  }

  _starGeo() {
    const shape = new THREE.Shape();
    const spikes = 5, outer = 0.26, inner = 0.12;
    let rot = -Math.PI / 2;
    const step = Math.PI / spikes;
    shape.moveTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
    for (let i = 0; i < spikes; i++) {
      rot += step;
      shape.lineTo(Math.cos(rot) * inner, Math.sin(rot) * inner);
      rot += step;
      shape.lineTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
    }
    return new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
  }

  _acquire() {
    let c = this.pool.pop();
    if (!c) {
      const group = new THREE.Group();
      if (this.shape === 'gem') {
        const gem = new THREE.Mesh(this.gemGeo, this.mat);
        gem.scale.set(1, 1.3, 1);
        gem.layers.enable(BLOOM_LAYER);
        group.add(gem);
      } else {
        const disc = new THREE.Mesh(this.discGeo, this.mat);
        disc.rotation.x = Math.PI / 2; // face the camera
        disc.layers.enable(BLOOM_LAYER);
        group.add(disc);
        const star = new THREE.Mesh(this.starGeo, this.starMat);
        star.position.z = 0.05;
        star.layers.enable(BLOOM_LAYER);
        group.add(star);
      }
      this.scene.add(group);
      c = { group, collected: false, bob: 0 };
    }
    c.group.visible = true;
    c.collected = false;
    c.group.scale.setScalar(1);
    this.scene.add(c.group);
    this.coins.push(c);
    return c;
  }

  _release(c) {
    c.group.visible = false;
    this.scene.remove(c.group);
    this.pool.push(c);
  }

  // Spawn a single coin in the pillar gap (kept light to reduce clutter/lag).
  spawnArc(x, gapCenter) {
    const c = this._acquire();
    c.group.position.set(x, gapCenter, 0.4);
    c.bob = Math.random() * Math.PI * 2;
  }

  start() { this.clear(); }

  clear() {
    for (const c of this.coins) this._release(c);
    this.coins.length = 0;
  }

  update(dt, eagle, speed, timeScale = 1) {
    const move = speed * dt * timeScale;
    const ex = eagle.group.position.x;
    const ey = eagle.group.position.y;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      const g = c.group;
      g.position.x -= move;
      c.bob += dt * 3;
      g.rotation.y += dt * 3.5;          // spin
      g.position.y += Math.sin(c.bob) * 0.004;

      const dx = ex - g.position.x;
      const dy = ey - g.position.y;
      const dist = Math.hypot(dx, dy);

      // Magnet assist when the eagle is close.
      if (!c.collected && dist < MAGNET_RANGE) {
        const pull = (1 - dist / MAGNET_RANGE) * 10 * dt;
        g.position.x += dx * pull;
        g.position.y += dy * pull;
      }

      // Collection.
      if (!c.collected && dist < PICKUP_RADIUS + COIN_RADIUS) {
        c.collected = true;
        if (this.onCollect) this.onCollect(COIN_VALUE, g.position.clone());
        this._release(c);
        this.coins.splice(i, 1);
        continue;
      }

      if (g.position.x < WORLD.DESPAWN_X) {
        this._release(c);
        this.coins.splice(i, 1);
      }
    }
  }
}
