// ============================================================================
//  obstacles.js — ObstacleManager
//  Spawns, moves, recycles, and scores pairs of patriotic pillars (red/white
//  stripes with a navy star-studded cap). Handles difficulty scaling and
//  fair AABB collision detection against the eagle.
// ============================================================================

import * as THREE from 'three';
import { COLORS, WORLD, OBSTACLES, SCORING } from './constants.js';

// --- Shared geometry/material builders (created once, reused) ----------------
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
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeStarCapTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0d1b4c';
  ctx.fillRect(0, 0, 256, 64);
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
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
  }
  ctx.closePath();
  ctx.fill();
}

export class ObstacleManager {
  constructor(scene) {
    this.scene = scene;
    this.pairs = [];
    this.pool = [];
    this.spawnTimer = 0;
    this.speed = OBSTACLES.SPEED_START;
    this.gap = OBSTACLES.GAP_START;
    this.running = false;

    this.stripeTex = makeStripedTexture();
    this.starTex = makeStarCapTexture();

    this._pillarGeo = new THREE.CylinderGeometry(
      OBSTACLES.WIDTH / 2, OBSTACLES.WIDTH / 2, 1, 24, 1, true);
    this._capGeo = new THREE.CylinderGeometry(
      OBSTACLES.WIDTH / 2 + 0.18, OBSTACLES.WIDTH / 2 + 0.18, 0.7, 24);
    this._lipGeo = new THREE.TorusGeometry(OBSTACLES.WIDTH / 2 + 0.05, 0.12, 8, 24);

    this.onScore = null;     // callback(score)
  }

  _makePillar(isTop) {
    const group = new THREE.Group();

    const stripeMat = new THREE.MeshStandardMaterial({
      map: this.stripeTex, roughness: 0.35, metalness: 0.1,
    });
    const shaft = new THREE.Mesh(this._pillarGeo, stripeMat);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    group.add(shaft);
    group.userData.shaft = shaft;

    // Navy star cap on the gap-facing end
    const capMat = new THREE.MeshStandardMaterial({
      map: this.starTex, color: 0xffffff, roughness: 0.4, metalness: 0.2,
    });
    const cap = new THREE.Mesh(this._capGeo, capMat);
    group.add(cap);
    group.userData.cap = cap;

    // Gold beveled lip for a soft 3D read
    const lipMat = new THREE.MeshStandardMaterial({
      color: COLORS.GOLD, roughness: 0.25, metalness: 0.6,
    });
    const lip = new THREE.Mesh(this._lipGeo, lipMat);
    lip.rotation.x = Math.PI / 2;
    group.add(lip);
    group.userData.lip = lip;

    group.userData.isTop = isTop;
    return group;
  }

  _acquirePair() {
    if (this.pool.length) {
      const p = this.pool.pop();
      p.top.visible = true;
      p.bottom.visible = true;
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
      const bottomEdge = gapCenter + gapSize / 2; // gap-facing end
      const center = bottomEdge + tall / 2;
      shaft.scale.y = tall;
      group.position.y = center;
      cap.position.y = bottomEdge - center; // local y of the gap-facing end
      lip.position.y = cap.position.y;
    } else {
      const topEdge = gapCenter - gapSize / 2; // gap-facing end
      const center = topEdge - tall / 2;
      shaft.scale.y = tall;
      group.position.y = center;
      cap.position.y = topEdge - center;
      lip.position.y = cap.position.y;
    }
    // Keep the stripe texture from stretching with the tall scale.
    this.stripeTex.repeat.set(1, tall / 3);
  }

  spawnPair() {
    const range = OBSTACLES.GAP_VERTICAL_RANGE;
    const gapCenter = (Math.random() * 2 - 1) * range * 0.5 + 0.5;
    const pair = this._acquirePair();
    pair.scored = false;
    pair.gapCenter = gapCenter;
    pair.gapSize = this.gap;
    pair.top.position.x = WORLD.SPAWN_X;
    pair.bottom.position.x = WORLD.SPAWN_X;
    this._layoutPillar(pair.top, true, gapCenter, this.gap);
    this._layoutPillar(pair.bottom, false, gapCenter, this.gap);
    this.pairs.push(pair);
  }

  start() {
    this.running = true;
    this.spawnTimer = 0.6; // small delay before first pillar
    this.speed = OBSTACLES.SPEED_START;
    this.gap = OBSTACLES.GAP_START;
  }

  stop() {
    this.running = false;
  }

  clear() {
    for (const p of this.pairs) {
      p.top.visible = false;
      p.bottom.visible = false;
      this.pool.push(p);
    }
    this.pairs.length = 0;
  }

  // Difficulty scales with score: faster + tighter every DIFFICULTY_STEP.
  applyDifficulty(score) {
    const steps = Math.floor(score / SCORING.DIFFICULTY_STEP);
    this.speed = Math.min(
      OBSTACLES.SPEED_MAX,
      OBSTACLES.SPEED_START + steps * OBSTACLES.SPEED_GROWTH_PER_5);
    this.gap = Math.max(
      OBSTACLES.GAP_MIN,
      OBSTACLES.GAP_START - steps * OBSTACLES.GAP_SHRINK_PER_5);
  }

  update(dt, eagle, timeScale = 1) {
    if (!this.running) return;
    const move = this.speed * dt * timeScale;

    // Spawn on a distance-consistent cadence.
    this.spawnTimer -= dt * timeScale;
    if (this.spawnTimer <= 0) {
      this.spawnPair();
      // Keep horizontal spacing roughly constant as speed grows.
      this.spawnTimer = (OBSTACLES.SPAWN_INTERVAL * OBSTACLES.SPEED_START) / this.speed;
    }

    const eagleX = eagle.group.position.x;
    for (let i = this.pairs.length - 1; i >= 0; i--) {
      const p = this.pairs[i];
      p.top.position.x -= move;
      p.bottom.position.x -= move;

      // Scoring: when the pillar center passes the eagle.
      if (!p.scored && p.top.position.x < eagleX) {
        p.scored = true;
        if (this.onScore) this.onScore();
      }

      // Recycle off-screen pillars.
      if (p.top.position.x < WORLD.DESPAWN_X) {
        p.top.visible = false;
        p.bottom.visible = false;
        this.pool.push(p);
        this.pairs.splice(i, 1);
      }
    }
  }

  // Fair AABB collision vs eagle bounds.
  collides(eagle) {
    const b = eagle.getBounds();
    const halfW = OBSTACLES.WIDTH / 2 - OBSTACLES.COLLISION_INSET;
    for (const p of this.pairs) {
      const cx = p.top.position.x;
      if (b.maxX < cx - halfW || b.minX > cx + halfW) continue; // not horizontally overlapping
      const gapTop = p.gapCenter + p.gapSize / 2 - OBSTACLES.COLLISION_INSET;
      const gapBottom = p.gapCenter - p.gapSize / 2 + OBSTACLES.COLLISION_INSET;
      // Safe only if entirely within the gap.
      if (b.maxY > gapTop || b.minY < gapBottom) return p;
    }
    return null;
  }
}
