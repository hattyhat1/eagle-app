// ============================================================================
//  postfx.js — Selective bloom post-processing
//  Only objects tagged with BLOOM_LAYER glow (sun, coins, neon pillars,
//  fireworks/particles, stars) — clouds, sky, ground, and the eagle stay
//  crisp. Two-pass technique: render a bloom-only buffer (everything else
//  blacked out) and additively composite it over the normal frame.
//  Fails safe to plain rendering if the pipeline can't initialize.
// ============================================================================

import * as THREE from 'three';
import { BLOOM_LAYER } from './constants.js';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from '../vendor/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js';

const DARK = new THREE.MeshBasicMaterial({ color: 0x000000 });

export class PostFX {
  constructor(renderer, scene, camera, opts = {}) {
    const { strength = 0.55, radius = 0.0, threshold = 0 } = opts;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = false;

    this.bloomLayer = new THREE.Layers();
    this.bloomLayer.set(BLOOM_LAYER);
    this._saved = new Map();
    this._hidden = [];

    try {
      const size = renderer.getSize(new THREE.Vector2());

      // Bloom-only buffer.
      this.bloomComposer = new EffectComposer(renderer);
      this.bloomComposer.renderToScreen = false;
      this.bloomComposer.addPass(new RenderPass(scene, camera));
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(size.x, size.y), strength, radius, threshold);
      this.bloomComposer.addPass(this.bloomPass);

      // Final composite: normal scene + additive bloom, then tone-map.
      const mix = new ShaderPass(new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: this.bloomComposer.renderTarget2.texture },
        },
        vertexShader: `varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv;
          void main(){ gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv); }`,
      }), 'baseTexture');
      mix.needsSwap = true;

      this.finalComposer = new EffectComposer(renderer);
      this.finalComposer.addPass(new RenderPass(scene, camera));
      this.finalComposer.addPass(mix);
      this.finalComposer.addPass(new OutputPass());

      this.enabled = true;
    } catch (e) {
      console.warn('PostFX disabled (falling back to direct render):', e);
      this.enabled = false;
    }
  }

  setSize(w, h) {
    if (this.bloomComposer) this.bloomComposer.setSize(w, h);
    if (this.finalComposer) this.finalComposer.setSize(w, h);
  }

  _darken = (obj) => {
    if (obj.isMesh && !this.bloomLayer.test(obj.layers)) {
      this._saved.set(obj, obj.material);
      obj.material = DARK;
    } else if (obj.isPoints && !this.bloomLayer.test(obj.layers)) {
      this._hidden.push(obj);
      obj.visible = false;
    }
  };

  _restore = (obj) => {
    if (this._saved.has(obj)) {
      obj.material = this._saved.get(obj);
    }
  };

  render() {
    // Pass 1: bloom-only (black background, non-glow objects blacked out).
    const bg = this.scene.background;
    this.scene.background = null;
    this.scene.traverse(this._darken);
    this.bloomComposer.render();
    this.scene.traverse(this._restore);
    for (const o of this._hidden) o.visible = true;
    this._saved.clear();
    this._hidden.length = 0;
    this.scene.background = bg;

    // Pass 2: full scene + additive bloom + tone map.
    this.finalComposer.render();
  }
}
