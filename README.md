# 🦅 AMERICAN EAGLE — 3D Flappy Flight

A polished, mobile-first 3D Flappy-style arcade game starring a heroic bald
eagle, drenched in red-white-and-blue patriotic spectacle: fireworks, confetti,
fanfare, waving flags, drifting balloons, and a star-spangled world.

Built with **Three.js** (via ES modules + import map — **no build step**).

![tap • click • space to flap](https://img.shields.io/badge/tap%20%E2%80%A2%20click%20%E2%80%A2%20space-to%20flap-c8102e)

---

## ▶️ Run it locally

Because the game uses ES modules + an import map, it must be served over HTTP
(opening `index.html` via `file://` will be blocked by the browser).

Pick any one of these from the project folder:

```bash
# Python 3 (built in on most systems)
python3 -m http.server 8000

# Node
npx serve .            # or:  npx http-server -p 8000
```

Then open **http://localhost:8000** in your browser (desktop or phone on the
same network).

> **Fully offline & zero-install.** Three.js (r160) is vendored locally in
> `vendor/three.module.js` and wired up via the import map in `index.html`, so
> there are no packages to install and no internet connection required.

---

## 🎮 How to play

- **Tap / Click / Spacebar** (or ↑) to flap upward.
- Gravity constantly pulls the eagle down.
- Fly through the gaps between the patriotic pillars.
- Each pair passed = **+1**. Every **10** points = fireworks + a `+10!` payoff.
- Hitting a pillar, the ground, or the ceiling ends the run.
- Beat your best score for a **NEW RECORD** confetti finale.
- Tap again to soar instantly.

The eagle stays fixed near the left; the world scrolls toward it.

---

## 🗂️ Project structure

```
eagle-app/
├── index.html          # markup, UI overlays, import map
├── styles.css          # red/white/blue arcade UI, banners, transitions
├── README.md
├── vendor/
│   └── three.module.js # bundled Three.js r160 (no install / offline)
└── js/
    ├── constants.js    # ALL tunable numbers (physics, obstacles, theme)
    ├── game.js         # GameManager — scene, loop, state machine, glue
    ├── eagle.js        # Eagle model + physics + animation
    ├── obstacles.js    # ObstacleManager — spawn/move/score/recycle/collide
    ├── environment.js  # sky, sun god-rays, clouds, balloons, hills, flags
    ├── particles.js    # fireworks, confetti, star-bursts, feathers, trail
    ├── ui.js           # UIManager — score, menus, game-over, transitions
    ├── audio.js        # AudioManager — fully procedural Web Audio sfx + mute
    ├── input.js        # InputManager — unifies tap/click/keyboard
    └── main.js         # entry point
```

### Architecture at a glance

- **Game states:** `MENU → PLAYING → GAME_OVER`, driven by `GameManager`.
- **`GameManager`** owns the Three.js scene/camera/renderer and orchestrates
  every subsystem, the loop, scoring, slow-mo, and screen shake.
- Each subsystem is a focused, single-responsibility module (see above).

---

## 🛠️ Tuning the feel

Everything you'd want to change lives in **`js/constants.js`**:

| Constant | What it controls |
| --- | --- |
| `PHYSICS.GRAVITY` / `FLAP_VELOCITY` | Fall speed & flap strength |
| `OBSTACLES.SPEED_START` / `SPEED_MAX` | World scroll speed & cap |
| `OBSTACLES.GAP_START` / `GAP_MIN` | Starting & smallest gap |
| `OBSTACLES.SPAWN_INTERVAL` | Seconds between pillars |
| `SCORING.DIFFICULTY_STEP` | Ramp difficulty every N points |
| `SPECTACLE_LEVEL` | `'subtle'` · `'standard'` · `'maximum'` |

`SPECTACLE_LEVEL` scales (or disables) all the over-the-top flourishes —
fireworks, confetti, eagle trail, screech frequency, slow-mo — without touching
any gameplay code.

---

## ✨ Features

- Fully 3D, low-poly bald eagle built from primitives (body, white head, hooked
  beak, friendly eyes, animated wings, gold-tipped tail).
- Patriotic striped pillars with navy star caps and gold beveled lips.
- Parallax world: sunburst god-rays, drifting clouds, hot-air balloons, amber
  hills, a green field lined with bunting and rippling cloth flags.
- Reusable particle systems: fireworks, confetti cannon, score star-bursts,
  flap puffs, collision feathers, and a red/white/blue eagle trail.
- Velocity-based tilt, wing-flap animation, idle bob, and a death tumble.
- Star-spangled screen-wipe transitions between states.
- Procedural Web Audio: flap whoosh, eagle screech, score chime, milestone
  fireworks + crowd cheer, new-record brass flourish, collision, and title
  fanfare — all with a persistent **mute** toggle.
- Local best-score saving, screen shake, slow-mo milestone beats.
- Responsive full-screen canvas, pause on tab blur, instant restart.
- One-tap controls for desktop **and** mobile.

No external paid assets, no copyrighted imagery — original flag-inspired art
generated procedurally.
