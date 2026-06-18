// ============================================================================
//  game.js — GameManager
//  The central conductor. Owns the Three.js scene/camera/renderer, all
//  subsystems (eagle, obstacles, environment, particles, UI, audio, input),
//  the MENU / PLAYING / GAME_OVER state machine, the game loop, scoring,
//  milestones, collisions, screen shake, slow-mo, and pause/resume.
// ============================================================================

import * as THREE from 'three';
import {
  STATE, COLORS, WORLD, SCORING, STORAGE_KEY, SPECTACLE,
} from './constants.js';
import { Eagle } from './eagle.js';
import { ObstacleManager } from './obstacles.js';
import { Environment } from './environment.js';
import { ParticleSystem } from './particles.js';
import { UIManager } from './ui.js';
import { AudioManager } from './audio.js';
import { InputManager } from './input.js';

export class GameManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = STATE.MENU;
    this.score = 0;
    this.best = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0;

    this.clock = new THREE.Clock();
    this.timeScale = 1;        // for slow-mo beats
    this.targetTimeScale = 1;
    this.shake = 0;            // screen-shake magnitude
    this.paused = false;
    this.introTimer = 1.8;     // cinematic fly-in duration
    this.trailTimer = 0;

    this._tmp = new THREE.Vector3();

    this._initRenderer();
    this._initScene();
    this._initSubsystems();
    this._bindWindow();

    // Enter menu (with cinematic intro).
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.SKY_BOTTOM);
    this.scene.fog = new THREE.Fog(COLORS.SKY_BOTTOM, 30, 60);

    this.camera = new THREE.PerspectiveCamera(
      45, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, WORLD.CAMERA_Y, WORLD.CAMERA_Z);
    this.camera.lookAt(0, WORLD.CAMERA_Y, 0);
    this.cameraBaseY = WORLD.CAMERA_Y;

    // Lighting: soft ambient + warm directional sun with shadows.
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xfff0c8, 1.1);
    sun.position.set(6, 14, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 50;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xbcd8ff, 0.35);
    fill.position.set(-8, 4, 6);
    this.scene.add(fill);
  }

  _initSubsystems() {
    this.environment = new Environment(this.scene);
    this.particles = new ParticleSystem(this.scene);

    this.eagle = new Eagle();
    this.scene.add(this.eagle.group);

    this.obstacles = new ObstacleManager(this.scene);
    this.obstacles.onScore = () => this._onScore();

    this.audio = new AudioManager();

    this.ui = new UIManager({
      onMuteToggle: () => this.audio.toggleMute(),
    });
    this.ui.setMuteIcon(this.audio.muted);
    this.ui.setScore(0);

    this.input = new InputManager(this.canvas.parentElement || document.body);
    this.input.onAction(() => this._handleAction());
    this.input.start();
  }

  _bindWindow() {
    window.addEventListener('resize', () => this._onResize());
    // Pause when the tab/page loses focus; resume on return.
    document.addEventListener('visibilitychange', () => {
      this.paused = document.hidden;
      if (!this.paused) this.clock.getDelta(); // discard the gap
    });
    window.addEventListener('blur', () => { this.paused = true; });
    window.addEventListener('focus', () => { this.paused = false; this.clock.getDelta(); });
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    // Pull the camera back a touch on narrow (portrait) screens so the play
    // lane stays fully visible on phones.
    const portrait = h > w;
    this.camera.position.z = portrait ? WORLD.CAMERA_Z + 7 : WORLD.CAMERA_Z;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  // --------------------------------------------------------------------------
  //  STATE MACHINE
  // --------------------------------------------------------------------------
  _handleAction() {
    // First gesture unlocks audio (and fires the title fanfare).
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
        // Guard against instantly restarting on the same tap that killed us.
        if (this._gameOverLock) return;
        this._restart();
        break;
    }
  }

  _enterMenu(intro = false) {
    this.state = STATE.MENU;
    this.score = 0;
    this.obstacles.stop();
    this.obstacles.clear();
    this.particles.clear();
    this.eagle.reset();
    this.ui.setScore(0);
    this.ui.showScore(false);
    this.ui.hideGameOver();
    this.ui.showMenu(this.best);
    if (intro) {
      this.introTimer = 1.8;
      // Eagle swoops in from the distant horizon.
      this.eagle.group.position.set(WORLD.SPAWN_X + 4, 5, -10);
    } else {
      this.introTimer = 0;
      this.ui.hideIntro();
    }
  }

  _startGame() {
    this.ui.transition(() => {
      this.state = STATE.PLAYING;
      this.score = 0;
      this.ui.setScore(0);
      this.ui.hideMenu();
      this.ui.hideIntro();
      this.ui.hideGameOver();
      this.ui.showScore(true);
      this.eagle.reset();
      this.obstacles.start();
      this.obstacles.applyDifficulty(0);
      this._flap(); // give a first lift so the player doesn't instantly drop
    });
  }

  _restart() {
    this.ui.transition(() => {
      this.state = STATE.PLAYING;
      this.score = 0;
      this.ui.setScore(0);
      this.ui.hideGameOver();
      this.ui.showScore(true);
      this.particles.clear();
      this.eagle.reset();
      this.obstacles.clear();
      this.obstacles.start();
      this.obstacles.applyDifficulty(0);
      this._flap();
    });
  }

  _flap() {
    this.eagle.flap();
    this.audio.flap();
    if (Math.random() < SPECTACLE.screechChance) this.audio.screech();
    this.eagle.getTrailAnchor(this._tmp);
    this.particles.flapPuff(this._tmp);
  }

  // --------------------------------------------------------------------------
  //  SCORING
  // --------------------------------------------------------------------------
  _onScore() {
    this.score += 1;
    this.ui.setScore(this.score);
    this.ui.popScore();
    this.audio.score();

    // Star-burst pop just ahead of the eagle.
    this._tmp.set(this.eagle.group.position.x + 1, this.eagle.group.position.y, 0.5);
    this.particles.scoreBurst(this._tmp);

    // Difficulty ramps every few points.
    this.obstacles.applyDifficulty(this.score);

    // Milestone payoff every 10 points.
    if (this.score % SCORING.MILESTONE_EVERY === 0) {
      this._milestone();
    }
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

    // Impact feedback: shake + feather/star burst.
    this.shake = 0.6;
    this._tmp.copy(this.eagle.group.position);
    this.particles.collisionBurst(this._tmp);
    if (SPECTACLE.slowMo) this._slowMo(0.25, 0.5);

    // Lock restart briefly so the killing tap doesn't immediately restart.
    this._gameOverLock = true;
    setTimeout(() => { this._gameOverLock = false; }, 450);

    const isNewRecord = this.score > this.best;
    if (isNewRecord) {
      this.best = this.score;
      localStorage.setItem(STORAGE_KEY, String(this.best));
    }

    // Reveal the panel after a short beat so the tumble reads.
    setTimeout(() => {
      this.ui.showScore(false);
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
    if (this.paused) { this.renderer.render(this.scene, this.camera); return; }
    dt = Math.min(dt, 0.05); // clamp big frame gaps

    // Smooth slow-mo interpolation.
    this.timeScale += (this.targetTimeScale - this.timeScale) * Math.min(1, dt * 8);
    const sdt = dt * this.timeScale;

    this.environment.update(dt); // background runs at real time
    this.particles.update(dt);

    if (this.state === STATE.MENU) {
      this._updateMenu(dt);
    } else if (this.state === STATE.PLAYING) {
      this._updatePlaying(sdt);
    } else if (this.state === STATE.GAME_OVER) {
      this.eagle.update(sdt);
    }

    this._updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  _updateMenu(dt) {
    if (this.introTimer > 0) {
      this.introTimer -= dt;
      // Swoop the eagle in from the horizon toward its idle spot.
      const target = new THREE.Vector3(WORLD.EAGLE_X, 0, 0);
      this.eagle.group.position.lerp(target, Math.min(1, dt * 3.2));
      this.eagle.group.rotation.z = THREE.MathUtils.damp(
        this.eagle.group.rotation.z, -0.2, 5, dt);
      this.eagle._setWing(Math.sin(performance.now() * 0.02) * 0.9);
      if (this.introTimer <= 0) this.ui.hideIntro();
    } else {
      this.eagle.updateIdle(dt);
    }
  }

  _updatePlaying(sdt) {
    this.eagle.update(sdt);
    this.obstacles.update(sdt, this.eagle, 1);

    // Eagle trail emitter.
    this.trailTimer -= sdt;
    if (this.trailTimer <= 0) {
      this.eagle.getTrailAnchor(this._tmp);
      this.particles.trail(this._tmp);
      this.trailTimer = 0.04;
    }

    const hit = this._checkCollisions();
    if (hit) this._gameOver();
  }

  _updateCamera(dt) {
    // Gentle idle float only on the menu; otherwise steady.
    let baseY = this.cameraBaseY;
    if (this.state === STATE.MENU) {
      baseY += Math.sin(performance.now() * 0.0008) * 0.3;
    }

    // Decaying screen shake on impact.
    let ox = 0, oy = 0;
    if (this.shake > 0.001) {
      ox = (Math.random() - 0.5) * this.shake;
      oy = (Math.random() - 0.5) * this.shake;
      this.shake *= Math.pow(0.001, dt); // fast decay
      if (this.shake < 0.01) this.shake = 0;
    }
    this.camera.position.x = ox;
    this.camera.position.y = baseY + oy;
    this.camera.lookAt(0, this.cameraBaseY, 0);
  }
}
