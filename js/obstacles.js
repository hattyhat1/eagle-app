// ============================================================================
//  obstacles.js — ObstacleManager
//  Spawns, moves, recycles, and scores pairs of patriotic pillars. Supports
//  swappable pillar STYLES (stripes / marble / gold / candy / neon), handles
//  difficulty scaling, and fair AABB collision against the eagle.
// ============================================================================

import * as THREE from 'three';
import { COLORS, WORLD, OBSTACLES, SCORING, BLOOM_LAYER } from './constants.js';
import { PILLARS } from './cosmetics.js';

// --- Texture builders -------------------------------------------------------
function makeStripedTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const ctx = c.getContext('2d');
  const stripeH = 256 / 7;
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#c8102e' : '#f7f7fb';
    ctx.fillRect(0, i * stripeH, 64, stripeH + 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeCandyTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f7f7fb'; ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = '#c8102e'; ctx.lineWidth = 14;
  for (let i = -64; i < 128; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 64, 64); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeStarCapTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0d1b4c'; ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 8; i++) drawStar(ctx, 16 + i * 32, 32, 5, 9, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

function drawStar(ctx, cx, cy, spikes, outer, inner) {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
  for (let i = 0; i < spikes; i++) {
    rot += step; ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
    rot += step; ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
  }
  ctx.closePath(); ctx.fill();
}

export class ObstacleManager {
  constructor(scene, style) {
    this.scene = scene;
    this.pairs = [];
    this.pool = [];
    this.allGroups = [];
    this.spawnTimer = 0;
    this.speed = OBSTACLES.SPEED_START;
    this.gap = OBSTACLES.GAP_START;
    this.vRange = OBSTACLES.VRANGE_START;
    this.running = false;
    this.onScore = null;
    this.onSpawn = null;        // callback(x, gapCenter) — used to place coins

    this.stripeTex = makeStripedTexture();
    this.starTex = makeStarCapTexture();
    this.candyTex = null;

    this._pillarGeo = new THREE.CylinderGeometry(
      OBSTACLES.WIDTH / 2, OBSTACLES.WIDTH / 2, 1, 24, 1, true);
    this._capGeo = new THREE.CylinderGeometry(
      OBSTACLES.WIDTH / 2 + 0.18, OBSTACLES.WIDTH / 2 + 0.18, 0.7, 24);
    this._lipGeo = new THREE.TorusGeometry(OBSTACLES.WIDTH / 2 + 0.05, 0.12, 8, 24);

    this.setStyle(style || PILLARS[0]);
  }

  // --------------------------------------------------------------------------
  //  STYLES
  // --------------------------------------------------------------------------
  setStyle(style) {
    this.style = style;
    const mats = this._styleMaterials(style);
    this.shaftMat = mats.shaft;
    this.capMat = mats.cap;
    this.lipMat = mats.lip;
    this.useStripeRepeat = mats.stripeRepeat;

    // Update every existing pillar (active + pooled) to the new look.
    for (const g of this.allGroups) {
      g.userData.shaft.material = this.shaftMat;
      g.userData.cap.material = this.capMat;
      g.userData.lip.material = this.lipMat;
      this._setBloom(g);
    }
  }

  // Neon pillars glow via the bloom pass; other styles do not.
  _setBloom(group) {
    const on = this.style.type === 'neon';
    for (const key of ['shaft', 'cap', 'lip']) {
      const mesh = group.userData[key];
      if (on) mesh.layers.enable(BLOOM_LAYER);
      else mesh.layers.disable(BLOOM_LAYER);
    }
  }

  _styleMaterials(style) {
    let shaft, cap, lip, stripeRepeat = false;
    const lipBase = { color: style.lip, roughness: 0.25, metalness: 0.6 };
    switch (style.type) {
      case 'marble':
        shaft = new THREE.MeshStandardMaterial({ color: 0xece7da, roughness: 0.22, metalness: 0.1 });
        cap = new THREE.MeshStandardMaterial({ color: COLORS.BLUE, roughness: 0.4, metalness: 0.3 });
        lip = new THREE.MeshStandardMaterial(lipBase);
        break;
      case 'gold':
        shaft = new THREE.MeshStandardMaterial({ color: 0xffcf40, roughness: 0.2, metalness: 0.55, emissive: 0x4a3300, emissiveIntensity: 0.25 });
        cap = new THREE.MeshStandardMaterial({ color: 0xe0a727, roughness: 0.25, metalness: 0.6, emissive: 0x3a2800, emissiveIntensity: 0.2 });
        lip = new THREE.MeshStandardMaterial({ ...lipBase, metalness: 0.6 });
        break;
      case 'candy':
        if (!this.candyTex) this.candyTex = makeCandyTexture();
        shaft = new THREE.MeshStandardMaterial({ map: this.candyTex, roughness: 0.3, metalness: 0.05 });
        cap = new THREE.MeshStandardMaterial({ color: COLORS.RED, roughness: 0.4 });
        lip = new THREE.MeshStandardMaterial(lipBase);
        break;
      case 'neon':
        shaft = new THREE.MeshStandardMaterial({ color: 0x0d1b4c, roughness: 0.3, metalness: 0.4, emissive: 0x0a3a55, emissiveIntensity: 0.6 });
        cap = new THREE.MeshStandardMaterial({ color: 0x0d1b4c, emissive: 0x39e6ff, emissiveIntensity: 1.3, roughness: 0.3 });
        lip = new THREE.MeshStandardMaterial({ ...lipBase, emissive: 0x39e6ff, emissiveIntensity: 1.0 });
        break;
      case 'stripes':
      default:
        shaft = new THREE.MeshStandardMaterial({ map: this.stripeTex, roughness: 0.35, metalness: 0.1 });
        cap = new THREE.MeshStandardMaterial({ map: this.starTex, color: 0xffffff, roughness: 0.4, metalness: 0.2 });
        lip = new THREE.MeshStandardMaterial(lipBase);
        stripeRepeat = true;
        break;
    }
    return { shaft, cap, lip, stripeRepeat };
  }

  // --------------------------------------------------------------------------
  //  PILLARS
  // --------------------------------------------------------------------------
  _makePillar(isTop) {
    const group = new THREE.Group();
    const shaft = new THREE.Mesh(this._pillarGeo, this.shaftMat);
    shaft.castShadow = true; shaft.receiveShadow = true;
    group.add(shaft); group.userData.shaft = shaft;

    const cap = new THREE.Mesh(this._capGeo, this.capMat);
    group.add(cap); group.userData.cap = cap;

    const lip = new THREE.Mesh(this._lipGeo, this.lipMat);
    lip.rotation.x = Math.PI / 2;
    group.add(lip); group.userData.lip = lip;

    group.userData.isTop = isTop;
    this._setBloom(group);
    this.allGroups.push(group);
    return group;
  }

  _acquirePair() {
    if (this.pool.length) {
      const p = this.pool.pop();
      p.top.visible = true; p.bottom.visible = true;
      return p;
    }
    const top = this._makePillar(true);
    const bottom = this._makePillar(false);
    this.scene.add(top, bottom);
    return { top, bottom, scored: false };
  }

  _layoutPillar(group, isTop, gapCenter, gapSize) {
    const tall = 22;
    const shaft = group.userData.shaft;
    const cap = group.userData.cap;
    const lip = group.userData.lip;

    if (isTop) {
      const bottomEdge = gapCenter + gapSize / 2;
      const center = bottomEdge + tall / 2;
      shaft.scale.y = tall;
      group.position.y = center;
      cap.position.y = bottomEdge - center;
      lip.position.y = cap.position.y;
    } else {
      const topEdge = gapCenter - gapSize / 2;
      const center = topEdge - tall / 2;
      shaft.scale.y = tall;
      group.position.y = center;
      cap.position.y = topEdge - center;
      lip.position.y = cap.position.y;
    }
    if (this.useStripeRepeat) this.stripeTex.repeat.set(1, tall / 3);
    if (this.candyTex) this.candyTex.repeat.set(2, tall / 1.5);
  }

  spawnPair() {
    const gapCenter = (Math.random() * 2 - 1) * this.vRange * 0.5 + 0.5;
    const pair = this._acquirePair();
    pair.scored = false;
    pair.gapCenter = gapCenter;
    pair.gapSize = this.gap;
    pair.top.position.x = WORLD.SPAWN_X;
    pair.bottom.position.x = WORLD.SPAWN_X;
    this._layoutPillar(pair.top, true, gapCenter, this.gap);
    this._layoutPillar(pair.bottom, false, gapCenter, this.gap);
    this.pairs.push(pair);
    if (this.onSpawn) this.onSpawn(WORLD.SPAWN_X, gapCenter);
  }

  start() {
    this.running = true;
    this.spawnTimer = 0.6;
    this.speed = OBSTACLES.SPEED_START;
    this.gap = OBSTACLES.GAP_START;
    this.vRange = OBSTACLES.VRANGE_START;
  }

  stop() { this.running = false; }

  clear() {
    for (const p of this.pairs) {
      p.top.visible = false; p.bottom.visible = false;
      this.pool.push(p);
    }
    this.pairs.length = 0;
  }

  applyDifficulty(score) {
    const steps = Math.floor(score / SCORING.DIFFICULTY_STEP);
    this.speed = Math.min(OBSTACLES.SPEED_MAX,
      OBSTACLES.SPEED_START + steps * OBSTACLES.SPEED_GROWTH_PER_5);
    this.gap = Math.max(OBSTACLES.GAP_MIN,
      OBSTACLES.GAP_START - steps * OBSTACLES.GAP_SHRINK_PER_5);
    this.vRange = Math.min(OBSTACLES.VRANGE_MAX,
      OBSTACLES.VRANGE_START + steps * OBSTACLES.VRANGE_GROWTH_PER_5);
  }

  update(dt, eagle, timeScale = 1) {
    if (!this.running) return;
    const move = this.speed * dt * timeScale;

    this.spawnTimer -= dt * timeScale;
    if (this.spawnTimer <= 0) {
      this.spawnPair();
      this.spawnTimer = (OBSTACLES.SPAWN_INTERVAL * OBSTACLES.SPEED_START) / this.speed;
    }

    const eagleX = eagle.group.position.x;
    for (let i = this.pairs.length - 1; i >= 0; i--) {
      const p = this.pairs[i];
      p.top.position.x -= move;
      p.bottom.position.x -= move;

      if (!p.scored && p.top.position.x < eagleX) {
        p.scored = true;
        if (this.onScore) this.onScore();
      }
      if (p.top.position.x < WORLD.DESPAWN_X) {
        p.top.visible = false; p.bottom.visible = false;
        this.pool.push(p);
        this.pairs.splice(i, 1);
      }
    }
  }

  collides(eagle) {
    const b = eagle.getBounds();
    const halfW = OBSTACLES.WIDTH / 2 - OBSTACLES.COLLISION_INSET;
    for (const p of this.pairs) {
      const cx = p.top.position.x;
      if (b.maxX < cx - halfW || b.minX > cx + halfW) continue;
      const gapTop = p.gapCenter + p.gapSize / 2 - OBSTACLES.COLLISION_INSET;
      const gapBottom = p.gapCenter - p.gapSize / 2 + OBSTACLES.COLLISION_INSET;
      if (b.maxY > gapTop || b.minY < gapBottom) return p;
    }
    return null;
  }
}
