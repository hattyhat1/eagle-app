// ============================================================================
//  AMERICAN EAGLE — 3D Flappy Flight
//  constants.js — All tunable gameplay & spectacle constants live here.
//  Tweak these numbers to change game feel without touching any logic.
// ============================================================================

// ---------------------------------------------------------------------------
//  GAME STATES
// ---------------------------------------------------------------------------
export const STATE = Object.freeze({
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER',
});

// ---------------------------------------------------------------------------
//  SPECTACLE / THEME
//  SPECTACLE_LEVEL scales all the over-the-top patriotic flourishes.
//  'subtle'   -> minimal celebration, gameplay-focused
//  'standard' -> balanced
//  'maximum'  -> full-throttle fireworks, confetti, screech, slow-mo
// ---------------------------------------------------------------------------
export const SPECTACLE_LEVEL = 'maximum';

const SPECTACLE_PRESETS = {
  subtle: {
    fireworks: 0.4,
    confetti: 0.5,
    trail: false,
    screechChance: 0.05,
    slowMo: false,
    godRays: true,
    balloons: 1,
  },
  standard: {
    fireworks: 0.8,
    confetti: 1.0,
    trail: true,
    screechChance: 0.12,
    slowMo: true,
    godRays: true,
    balloons: 2,
  },
  maximum: {
    fireworks: 1.0,
    confetti: 1.4,
    trail: true,
    screechChance: 0.18,
    slowMo: true,
    godRays: true,
    balloons: 3,
  },
};

export const SPECTACLE = SPECTACLE_PRESETS[SPECTACLE_LEVEL] || SPECTACLE_PRESETS.standard;

// ---------------------------------------------------------------------------
//  COLOR PALETTE — bold red / white / blue with gold accents
// ---------------------------------------------------------------------------
export const COLORS = Object.freeze({
  RED: 0xc8102e,
  RED_BRIGHT: 0xe23b50,
  WHITE: 0xf7f7fb,
  BLUE: 0x16307a,
  BLUE_BRIGHT: 0x2b56c6,
  NAVY: 0x0d1b4c,
  GOLD: 0xffcf40,
  GOLD_DEEP: 0xe0a727,
  SKY_TOP: 0x3da4ff,
  SKY_BOTTOM: 0xbfe6ff,
  SUN: 0xfff2b0,
  GROUND: 0x4caf50,
  GROUND_DARK: 0x3a8a3e,
  HILL: 0xe8b46a,
  HILL_FAR: 0xd99a4e,
  EAGLE_BODY: 0x4a2f1e,
  EAGLE_BODY_DARK: 0x3a2417,
  EAGLE_HEAD: 0xf7f7fb,
  BEAK: 0xffb020,
  PUPIL: 0x111111,
});

// ---------------------------------------------------------------------------
//  WORLD / CAMERA layout (world units)
// ---------------------------------------------------------------------------
export const WORLD = Object.freeze({
  EAGLE_X: -4.5,          // eagle stays fixed at this horizontal position
  SPAWN_X: 14,            // obstacles appear here
  DESPAWN_X: -14,         // obstacles recycled past here
  CEILING_Y: 8.0,         // fly too high -> game over
  GROUND_Y: -6.2,         // top surface of the ground (collision)
  GROUND_VISUAL_Y: -8.2,  // ground box center (height 4 -> top sits at GROUND_Y)
  CAMERA_Z: 18,
  CAMERA_Y: 0.4,
});

// ---------------------------------------------------------------------------
//  PHYSICS — tuned to feel like classic Flappy Bird
// ---------------------------------------------------------------------------
export const PHYSICS = Object.freeze({
  GRAVITY: -34,           // units / s^2 (constant downward pull)
  FLAP_VELOCITY: 11.8,    // instant upward velocity on flap
  MAX_FALL_SPEED: -22,    // terminal velocity clamp
  MAX_RISE_SPEED: 14,     // clamp on upward speed
  TILT_UP: 0.55,          // radians when rising fast
  TILT_DOWN: -1.0,        // radians when diving
  TILT_LERP: 8,           // rotation smoothing factor
});

// ---------------------------------------------------------------------------
//  EAGLE dimensions (used for collision box)
// ---------------------------------------------------------------------------
export const EAGLE = Object.freeze({
  HEIGHT: 1.4,
  // Collision half-extents — kept slightly smaller than the visual model
  // so collisions feel fair, not punishing.
  HALF_W: 0.55,
  HALF_H: 0.5,
});

// ---------------------------------------------------------------------------
//  OBSTACLES — patriotic pillars
// ---------------------------------------------------------------------------
export const OBSTACLES = Object.freeze({
  WIDTH: 1.7,             // pillar diameter
  GAP_START: 4.6,         // initial vertical gap (~3.3x eagle height)
  GAP_MIN: 3.2,           // smallest the gap will shrink to
  GAP_SHRINK_PER_5: 0.18, // gap reduction applied every 5 points
  SPEED_START: 6.0,       // world scroll speed
  SPEED_MAX: 10.5,
  SPEED_GROWTH_PER_5: 0.35, // speed bump every 5 points
  SPAWN_INTERVAL: 1.7,    // seconds between spawns (at start speed)
  GAP_VERTICAL_RANGE: 4.2, // how far the gap center can wander up/down
  COLLISION_INSET: 0.18,  // shrink collision box for fairness
});

// ---------------------------------------------------------------------------
//  SCORING / DIFFICULTY
// ---------------------------------------------------------------------------
export const SCORING = Object.freeze({
  MILESTONE_EVERY: 10,    // fireworks + "+10!" banner
  DIFFICULTY_STEP: 5,     // ramp difficulty every N points
});

// ---------------------------------------------------------------------------
//  STORAGE
// ---------------------------------------------------------------------------
export const STORAGE_KEY = 'americanEagle.bestScore.v1';
export const MUTE_KEY = 'americanEagle.muted.v1';

// Render layer reserved for selective bloom — objects with this layer enabled
// (coins, neon pillars, fireworks, stars) are the ones that would glow.
export const BLOOM_LAYER = 1;

// Bloom post-processing is implemented (js/postfx.js) but OFF by default: the
// EffectComposer path softened/washed the colours on this stylized scene, and a
// crisp direct render looks better. Flip to true to experiment with the glow.
export const ENABLE_BLOOM = false;
