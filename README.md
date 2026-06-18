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
    ├── cosmetics.js    # catalog: eagle skins, worlds, trails, pillars, coin packs
    ├── store.js        # PlayerStore — coins, ownership, equip, Stripe redeem
    ├── shop.js         # ShopUI — the customization + coin shop overlay
    ├── coins.js        # CoinManager — collectible coins in the pillar gaps
    ├── game.js         # GameManager — scene, loop, state machine, glue
    ├── eagle.js        # Eagle model + physics + animation + skins
    ├── obstacles.js    # ObstacleManager — spawn/move/score/recycle/collide/styles
    ├── environment.js  # themeable sky, god-rays, clouds, balloons, hills, flags
    ├── particles.js    # fireworks, confetti, star-bursts, feathers, trails
    ├── ui.js           # UIManager — score, coins, menus, game-over, transitions
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

## 🪙 Coins, customization & the shop

- **Earn coins** by grabbing the golden star-coins that appear in the pillar
  gaps mid-flight (there's a gentle magnet so pickups feel generous). Your
  balance is shown top-left and saved locally.
- **Open the shop** with the 🛍️ button (available on the menu and game-over
  screens). Spend coins to unlock and equip:
  - **Eagles** — 6 skins incl. Patriot, Cool (shades), Top-Hat, Arctic, Galaxy
  - **Worlds** — 5 backgrounds: Golden Sunrise, Sunset, Fireworks Night, Space, Winter
  - **Trails** — 5 styles: Star Spangle, Fire, Rainbow, Ribbon, Golden Glow
  - **Pillars** — 5 styles: Flag Stripes, Marble, Solid Gold, Candy Cane, Neon
- The first item in every category is **free and equipped by default**.
- Everything you own/equip persists in `localStorage` and applies instantly.

To add items or change prices, edit the catalog in **`js/cosmetics.js`**.

## 💳 Real-money coins (optional, Stripe — no backend)

The shop's **Coins** tab can sell coin packs for real money using **Stripe
Payment Links**, which need no server. To enable it:

1. Create a free [Stripe](https://stripe.com) account.
2. Create a **Payment Link** for each pack.
3. In each link's settings, set the post-payment redirect to your game URL with
   `?coins=<PACK_ID>`, e.g. `https://YOUR.github.io/eagle-app/?coins=medium`.
4. Paste each Payment Link URL into the matching entry in
   `COIN_PACKS` inside **`js/cosmetics.js`**.

When a buyer returns from Stripe, the game reads the `?coins=` parameter and
credits the pack (once per Stripe session id), then cleans the URL.

> ⚠️ With no backend this is **honor-system** — a determined user could edit
> their local storage. That's expected and fine for a free static game. If you
> ever need verified purchases, add a small serverless function to validate the
> Stripe session before crediting. Until a link is set, packs show
> "Setup needed."

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

- **Coins** collectible mid-flight, with a magnet assist and sparkle pickups.
- **Shop** with 4 customization categories (eagles, worlds, trails, pillars)
  plus an optional real-money coin tab; all progress saved locally.
- Reflection environment map so gold/coins/metals look genuinely shiny, plus
  ACES tone mapping for richer color.

No external paid assets, no copyrighted imagery — original flag-inspired art
generated procedurally.
