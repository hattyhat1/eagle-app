// ============================================================================
//  game.js — GameManager
//  The central conductor. Owns the Three.js scene/camera/renderer, all
//  subsystems (eagle, obstacles, coins, environment, particles, UI, audio,
//  input, store, shop), the MENU / PLAYING / GAME_OVER state machine, the game
//  loop, scoring, coins, milestones, collisions, screen shake, slow-mo, and
//  pause/resume.
// ============================================================================

import * as THREE from 'three';
import {
  STATE, COLORS, WORLD, SCORING, STORAGE_KEY, SPECTACLE, ENABLE_BLOOM,
} from './constants.js';
import { Eagle } from './eagle.js';
import { ObstacleManager } from './obstacles.js';
import { CoinManager } from './coins.js';
import { Environment } from './environment.js';
import { ParticleSystem } from './particles.js';
import { UIManager } from './ui.js';
import { AudioManager } from './audio.js';
import { InputManager } from './input.js';
import { PlayerStore } from './store.js';
import { ShopUI } from './shop.js';
import { PostFX } from './postfx.js';

export class GameManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = STATE.MENU;
    this.score = 0;
    this.runCoins = 0;
    this.best = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0;

    this.store = new PlayerStore();

    this.clock = new THREE.Clock();
    this.timeScale = 1;
    this.targetTimeScale = 1;
    this.shake = 0;
    this.paused = false;
    this.introTimer = 1.8;
    this.trailTimer = 0;
    this.ambientFwTimer = 3;

    this._tmp = new THREE.Vector3();

    this._initRenderer();
    this._initScene();
    this._initSubsystems();
    this.postfx = ENABLE_BLOOM ? new PostFX(this.renderer, this.scene, this.camera) : null;
    this._bindWindow();

    // Credit any real-money coin purchase returning from Stripe.
    const credited = this.store.redeemFromUrl();
    this.ui.setCoins(this.store.coins);
    if (credited) {
      setTimeout(() => {
        this.audio.unlock(); this.audio.purchase();
        this.ui.popCoins();
        this.particles.fireworksShow(4);
      }, 600);
    }

    this._enterMenu(true);
    this._loop();
  }

  // --------------------------------------------------------------------------
  //  SETUP
  // --------------------------------------------------------------------------
  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas, antialias: true, powerPreference: 'high-performance',
    });
    // Cap device pixel ratio at 1.5: high-DPI phones render far fewer pixels
    // this way (a big FPS win) with little visible loss.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // ACES is applied once: by OutputPass at the end of the composer chain, or
    // by the renderer directly in the no-postfx fallback path.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.SKY_BOTTOM);
    // A soft gradient reflection map so metallic gold/coins/lips read as shiny
    // instead of dark (MeshStandardMaterial needs something to reflect).
    this.scene.environment = this._makeEnvMap();

    this.camera = new THREE.PerspectiveCamera(
      45, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, WORLD.CAMERA_Y, WORLD.CAMERA_Z);
    this.camera.lookAt(0, WORLD.CAMERA_Y, 0);
    this.cameraBaseY = WORLD.CAMERA_Y;

    // Hemisphere light gives a natural sky→ground colour gradient.
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x4a6b3a, 0.55);
    this.scene.add(this.hemi);

    this.ambient = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xfff0c8, 1.2);
    this.sun.position.set(6, 14, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024); // 1K shadows — much cheaper than 2K
    this.sun.shadow.radius = 3;              // softer PCF edges
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.camera.left = -14; this.sun.shadow.camera.right = 14;
    this.sun.shadow.camera.top = 14; this.sun.shadow.camera.bottom = -14;
    this.sun.shadow.camera.near = 1; this.sun.shadow.camera.far = 50;
    this.scene.add(this.sun);

    this.fill = new THREE.DirectionalLight(0xbcd8ff, 0.3);
    this.fill.position.set(-8, 4, 6);
    this.scene.add(this.fill);

    // Rim/back light to give the eagle a heroic edge highlight.
    this.rim = new THREE.DirectionalLight(0xffe6b0, 0.6);
    this.rim.position.set(-6, 6, -10);
    this.scene.add(this.rim);
  }

  _makeEnvMap() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 32;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 32);
    g.addColorStop(0, '#dff1ff');
    g.addColorStop(0.5, '#ffffff');
    g.addColorStop(1, '#ffe9c0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 32);
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _initSubsystems() {
    const eq = (c) => this.store.getEquipped(c);

    this.environment = new Environment(this.scene, eq('background'));
    this._applyThemeLighting(eq('background'));
    this.particles = new ParticleSystem(this.scene);
    this.particles.setTrailStyle(eq('trail'));

    this.eagle = new Eagle(eq('eagle'));
    this.scene.add(this.eagle.group);

    this.obstacles = new ObstacleManager(this.scene, eq('pillar'));
    this.obstacles.onScore = () => this._onScore();
    this.obstacles.onSpawn = (x, gapCenter) => this.coins.spawnArc(x, gapCenter);

    this.coins = new CoinManager(this.scene, eq('coin'));
    this.coins.onCollect = (value, pos) => this._onCoin(value, pos);

    this.audio = new AudioManager();

    this.shop = new ShopUI(this.store, this.audio, {
      onEquip: (cat, item) => this._applyEquip(cat, item),
      onCoins: (n) => this.ui.setCoins(n),
    });

    this.ui = new UIManager({
      onMuteToggle: () => this.audio.toggleMute(),
      onShop: () => this._openShop(),
    });
    this.ui.setMuteIcon(this.audio.muted);
    this.ui.setScore(0);
    this.ui.setCoins(this.store.coins);

    this.input = new InputManager(this.canvas.parentElement || document.body);
    this.input.onAction(() => this._handleAction());
    this.input.start();
  }

  _bindWindow() {
    window.addEventListener('resize', () => this._onResize());
    document.addEventListener('visibilitychange', () => {
      this.paused = document.hidden;
      if (!this.paused) this.clock.getDelta();
    });
    window.addEventListener('blur', () => { this.paused = true; });
    window.addEventListener('focus', () => { this.paused = false; this.clock.getDelta(); });
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    const portrait = h > w;
    this.camera.position.z = portrait ? WORLD.CAMERA_Z + 7 : WORLD.CAMERA_Z;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    if (this.postfx) this.postfx.setSize(w, h);
  }

  _render() {
    if (this.postfx && this.postfx.enabled) this.postfx.render();
    else this.renderer.render(this.scene, this.camera);
  }

  // --------------------------------------------------------------------------
  //  COSMETICS
  // --------------------------------------------------------------------------
  _applyThemeLighting(theme) {
    this.ambient.intensity = theme.ambient * 0.65;
    this.hemi.intensity = theme.ambient * 0.8;
    this.sun.intensity = theme.sunInt;
    this.rim.intensity = (theme.night || theme.space) ? 0.35 : 0.6;
  }

  _applyEquip(category, item) {
    if (category === 'eagle') this.eagle.applySkin(item);
    else if (category === 'trail') this.particles.setTrailStyle(item);
    else if (category === 'pillar') this.obstacles.setStyle(item);
    else if (category === 'coin') this.coins.applySkin(item);
    else if (category === 'background') {
      this.environment.setTheme(item);
      this._applyThemeLighting(item);
    }
  }

  _openShop() {
    if (this.state === STATE.PLAYING) return; // only from menu / game over
    this.audio.unlock();
    this.shop.open();
  }

  // --------------------------------------------------------------------------
  //  STATE MACHINE
  // --------------------------------------------------------------------------
  _handleAction() {
    if (this.shop.isOpen) return; // shop handles its own taps

    const firstUnlock = !this.audio._unlocked;
    this.audio.unlock();

    switch (this.state) {
      case STATE.MENU:
        if (firstUnlock) this.audio.fanfare();
        this._startGame();
        break;
      case STATE.PLAYING:
        this._flap();
        break;
      case STATE.GAME_OVER:
        if (this._gameOverLock) return;
        this._restart();
        break;
    }
  }

  _enterMenu(intro = false) {
    this.state = STATE.MENU;
    this.score = 0;
    this.runCoins = 0;
    this.obstacles.stop();
    this.obstacles.clear();
    this.coins.clear();
    this.particles.clear();
    this.eagle.reset();
    this.ui.setScore(0);
    this.ui.showScore(false);
    this.ui.hideGameOver();
    this.ui.showMenu(this.best);
    this.ui.showShopButton(true);
    if (intro) {
      this.introTimer = 1.8;
      this.eagle.group.position.set(WORLD.SPAWN_X + 4, 5, -10);
    } else {
      this.introTimer = 0;
      this.ui.hideIntro();
    }
  }

  _beginRun() {
    this.state = STATE.PLAYING;
    this.score = 0;
    this.runCoins = 0;
    this.ui.setScore(0);
    this.ui.hideMenu();
    this.ui.hideIntro();
    this.ui.hideGameOver();
    this.ui.showScore(true);
    this.ui.showShopButton(false);
    this.particles.clear();
    this.eagle.reset();
    this.coins.clear();
    this.obstacles.clear();
    this.obstacles.start();
    this.obstacles.applyDifficulty(0);
    this._flap();
  }

  _startGame() { this.ui.transition(() => this._beginRun()); }
  _restart() { this.ui.transition(() => this._beginRun()); }

  _flap() {
    this.eagle.flap();
    this.audio.flap();
    if (Math.random() < SPECTACLE.screechChance) this.audio.screech();
    this.eagle.getTrailAnchor(this._tmp);
    this.particles.flapPuff(this._tmp);
  }

  // --------------------------------------------------------------------------
  //  SCORING & COINS
  // --------------------------------------------------------------------------
  _onScore() {
    this.score += 1;
    this.ui.setScore(this.score);
    this.ui.popScore();
    this.audio.score();

    this._tmp.set(this.eagle.group.position.x + 1, this.eagle.group.position.y, 0.5);
    this.particles.scoreBurst(this._tmp);
    this.obstacles.applyDifficulty(this.score);

    if (this.score % SCORING.MILESTONE_EVERY === 0) this._milestone();
  }

  _onCoin(value, pos) {
    this.runCoins += value;
    this.store.addCoins(value);
    this.ui.setCoins(this.store.coins);
    this.ui.popCoins();
    this.particles.coinPickup(pos);
    this.audio.coin();
  }

  _milestone() {
    this.ui.showMilestone(`+${SCORING.MILESTONE_EVERY}! ★`);
    this.audio.milestone();
    this.particles.fireworksShow(6);
    if (SPECTACLE.slowMo) this._slowMo(0.35, 0.6);
  }

  _slowMo(scale, duration) {
    this.targetTimeScale = scale;
    clearTimeout(this._slowMoTimer);
    this._slowMoTimer = setTimeout(() => { this.targetTimeScale = 1; }, duration * 1000);
  }

  // --------------------------------------------------------------------------
  //  COLLISION / GAME OVER
  // --------------------------------------------------------------------------
  _checkCollisions() {
    const b = this.eagle.getBounds();
    if (b.minY <= WORLD.GROUND_Y) return 'ground';
    if (b.maxY >= WORLD.CEILING_Y) return 'ceiling';
    if (this.obstacles.collides(this.eagle)) return 'pillar';
    return null;
  }

  _gameOver() {
    this.state = STATE.GAME_OVER;
    this.obstacles.stop();
    this.eagle.kill();
    this.audio.collision();
    this.audio.gameOver();

    this.shake = 0.6;
    this._tmp.copy(this.eagle.group.position);
    this.particles.collisionBurst(this._tmp);
    if (SPECTACLE.slowMo) this._slowMo(0.25, 0.5);

    this._gameOverLock = true;
    setTimeout(() => { this._gameOverLock = false; }, 450);

    const isNewRecord = this.score > this.best;
    if (isNewRecord) {
      this.best = this.score;
      localStorage.setItem(STORAGE_KEY, String(this.best));
    }

    setTimeout(() => {
      this.ui.showScore(false);
      this.ui.setRunCoins(this.runCoins);
      this.ui.showShopButton(true);
      this.ui.showGameOver(this.score, this.best, isNewRecord);
      if (isNewRecord) {
        this.audio.newRecord();
        this.particles.confettiCannon();
        this.particles.fireworksShow(8);
      }
    }, 500);
  }

  // --------------------------------------------------------------------------
  //  MAIN LOOP
  // --------------------------------------------------------------------------
  _loop() {
    requestAnimationFrame(() => this._loop());
    let dt = this.clock.getDelta();
    if (this.paused || this.shop.isOpen) { this._render(); return; }
    dt = Math.min(dt, 0.05);

    this.timeScale += (this.targetTimeScale - this.timeScale) * Math.min(1, dt * 8);
    const sdt = dt * this.timeScale;

    this.environment.update(dt);
    this.particles.update(dt);
    this._ambientFireworks(dt);

    if (this.state === STATE.MENU) this._updateMenu(dt);
    else if (this.state === STATE.PLAYING) this._updatePlaying(sdt);
    else if (this.state === STATE.GAME_OVER) this.eagle.update(sdt);

    this._updateCamera(dt);
    this._render();
  }

  // Occasional background fireworks for the night theme.
  _ambientFireworks(dt) {
    if (!this.environment.theme.night) return;
    if (this.state === STATE.GAME_OVER) return;
    this.ambientFwTimer -= dt;
    if (this.ambientFwTimer <= 0) {
      this.ambientFwTimer = 2 + Math.random() * 2;
      this._tmp.set((Math.random() - 0.4) * 14, 3 + Math.random() * 4, -6);
      this.particles.firework(this._tmp);
    }
  }

  _updateMenu(dt) {
    if (this.introTimer > 0) {
      this.introTimer -= dt;
      const target = new THREE.Vector3(WORLD.EAGLE_X, 0, 0);
      this.eagle.group.position.lerp(target, Math.min(1, dt * 3.2));
      this.eagle.group.rotation.z = THREE.MathUtils.damp(this.eagle.group.rotation.z, -0.2, 5, dt);
      this.eagle._setWing(Math.sin(performance.now() * 0.02) * 0.9);
      if (this.introTimer <= 0) this.ui.hideIntro();
    } else {
      this.eagle.updateIdle(dt);
    }
  }

  _updatePlaying(sdt) {
    this.eagle.update(sdt);
    this.obstacles.update(sdt, this.eagle, 1);
    this.coins.update(sdt, this.eagle, this.obstacles.speed, 1);

    this.trailTimer -= sdt;
    if (this.trailTimer <= 0) {
      this.eagle.getTrailAnchor(this._tmp);
      this.particles.trail(this._tmp);
      this.trailTimer = 0.07; // thinner trail -> fewer live particles
    }

    const hit = this._checkCollisions();
    if (hit) this._gameOver();
  }

  _updateCamera(dt) {
    let baseY = this.cameraBaseY;
    if (this.state === STATE.MENU) baseY += Math.sin(performance.now() * 0.0008) * 0.3;

    let ox = 0, oy = 0;
    if (this.shake > 0.001) {
      ox = (Math.random() - 0.5) * this.shake;
      oy = (Math.random() - 0.5) * this.shake;
      this.shake *= Math.pow(0.001, dt);
      if (this.shake < 0.01) this.shake = 0;
    }
    this.camera.position.x = ox;
    this.camera.position.y = baseY + oy;
    this.camera.lookAt(0, this.cameraBaseY, 0);
  }
}
