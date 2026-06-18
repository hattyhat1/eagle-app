// ============================================================================
//  cosmetics.js — Customization catalog (single source of truth)
//  Every purchasable / equippable item lives here: eagle skins, background
//  themes, eagle trails, pillar styles, and real-money coin packs.
//  Prices are in COINS. The first item in each list is FREE (owned by default).
// ============================================================================

// Convert a 0xRRGGBB number to a CSS hex string (for shop swatches).
export const cssHex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);

// ---------------------------------------------------------------------------
//  EAGLE SKINS
//  body/head/beak/accent are 0xRRGGBB. accessory: 'none' | 'shades' | 'tophat'.
//  emissive (optional) adds a soft glow tint.
// ---------------------------------------------------------------------------
export const EAGLE_SKINS = [
  { id: 'classic', name: 'Classic Eagle', price: 0,
    body: 0x4a2f1e, bodyDark: 0x3a2417, head: 0xf7f7fb, beak: 0xffb020, accent: 0xffcf40, accessory: 'none' },
  { id: 'patriot', name: 'Patriot', price: 150,
    body: 0x16307a, bodyDark: 0x0d1b4c, head: 0xf7f7fb, beak: 0xffb020, accent: 0xc8102e, accessory: 'none' },
  { id: 'shades', name: 'Cool Eagle', price: 250,
    body: 0x4a2f1e, bodyDark: 0x3a2417, head: 0xf7f7fb, beak: 0xffb020, accent: 0xffcf40, accessory: 'shades' },
  { id: 'uncle', name: 'Top-Hat Eagle', price: 400,
    body: 0x4a2f1e, bodyDark: 0x3a2417, head: 0xf7f7fb, beak: 0xffb020, accent: 0xc8102e, accessory: 'tophat' },
  { id: 'arctic', name: 'Arctic Eagle', price: 350,
    body: 0xdfe7ef, bodyDark: 0xb9c6d6, head: 0xffffff, beak: 0xffd060, accent: 0x9fd0ff, accessory: 'none' },
  { id: 'galaxy', name: 'Galaxy Eagle', price: 600,
    body: 0x3a1d6e, bodyDark: 0x241046, head: 0xe9d8ff, beak: 0xffcf40, accent: 0xff5fae, accessory: 'none', emissive: 0x6a2fb0 },
];

// ---------------------------------------------------------------------------
//  BACKGROUND THEMES
//  Drives sky gradient, sun, hills, ground, fog, and special features
//  (night stars + moon, space starfield, winter snow).
// ---------------------------------------------------------------------------
export const BACKGROUNDS = [
  { id: 'sunrise', name: 'Golden Sunrise', price: 0,
    skyTop: 0x3da4ff, skyMid: 0x79c6ff, skyBottom: 0xcfeeff,
    sun: 0xfff2b0, glow: 0xffe9a8, hill: 0xe8b46a, hillFar: 0xd99a4e,
    ground: 0x4caf50, groundDark: 0x3a8a3e, fog: 0xbfe6ff, ambient: 0.7, sunInt: 1.1 },
  { id: 'sunset', name: 'Sunset Glory', price: 250,
    skyTop: 0x3a2a6e, skyMid: 0xe06a4a, skyBottom: 0xffb36b,
    sun: 0xff7a3c, glow: 0xff9a5a, hill: 0x8a4a6a, hillFar: 0x5a3358,
    ground: 0x6a7a3a, groundDark: 0x4a5a2a, fog: 0xe89a6a, ambient: 0.6, sunInt: 1.0 },
  { id: 'night', name: 'Fireworks Night', price: 400,
    skyTop: 0x05071a, skyMid: 0x0d1b4c, skyBottom: 0x21356e,
    sun: 0xfdf6d0, glow: 0xbfd0ff, hill: 0x1a2750, hillFar: 0x101a3a,
    ground: 0x1f5a2a, groundDark: 0x143d1d, fog: 0x0d1b4c, ambient: 0.45, sunInt: 0.5,
    night: true },
  { id: 'space', name: 'Eagle in Space', price: 600,
    skyTop: 0x02030a, skyMid: 0x070b22, skyBottom: 0x0a0f30,
    sun: 0xfff2b0, glow: 0x88aaff, hill: 0x0a0f30, hillFar: 0x05081f,
    ground: 0x141b3a, groundDark: 0x0a0f24, fog: 0x05081f, ambient: 0.5, sunInt: 0.7,
    space: true },
  { id: 'winter', name: 'Winter Wonder', price: 500,
    skyTop: 0x8fb6e8, skyMid: 0xc3dcf5, skyBottom: 0xeef6ff,
    sun: 0xffffff, glow: 0xdfeaff, hill: 0xdfe9f5, hillFar: 0xc6d6e8,
    ground: 0xf2f7ff, groundDark: 0xd6e2f0, fog: 0xeef6ff, ambient: 0.85, sunInt: 1.0,
    snow: true },
];

// ---------------------------------------------------------------------------
//  EAGLE TRAILS
//  shape: 'star' | 'sphere' | 'stripe'.  colors: array of 0xRRGGBB.
// ---------------------------------------------------------------------------
export const TRAILS = [
  { id: 'stars', name: 'Star Spangle', price: 0,
    shape: 'star', colors: [0xc8102e, 0xf7f7fb, 0x2b56c6, 0xffcf40] },
  { id: 'fire', name: 'Eagle Fire', price: 120,
    shape: 'sphere', colors: [0xff3d00, 0xff8a00, 0xffd000], emissive: true },
  { id: 'rainbow', name: 'Rainbow', price: 200,
    shape: 'sphere', colors: [0xff0040, 0xff8a00, 0xffe000, 0x36d36b, 0x2b9bff, 0x9b4bff], emissive: true },
  { id: 'stripes', name: 'Ribbon', price: 150,
    shape: 'stripe', colors: [0xc8102e, 0xf7f7fb, 0x2b56c6] },
  { id: 'gold', name: 'Golden Glow', price: 300,
    shape: 'sphere', colors: [0xffcf40, 0xffe899, 0xe0a727], emissive: true },
];

// ---------------------------------------------------------------------------
//  PILLAR STYLES
//  type drives the texture/material builder in ObstacleManager.
// ---------------------------------------------------------------------------
export const PILLARS = [
  { id: 'stripes', name: 'Flag Stripes', price: 0, type: 'stripes', lip: 0xffcf40 },
  { id: 'marble', name: 'Marble Monument', price: 150, type: 'marble', lip: 0xffcf40 },
  { id: 'gold', name: 'Solid Gold', price: 400, type: 'gold', lip: 0xfff2b0 },
  { id: 'candy', name: 'Candy Cane', price: 200, type: 'candy', lip: 0xf7f7fb },
  { id: 'neon', name: 'Neon Glow', price: 350, type: 'neon', lip: 0x39e6ff },
];

// ---------------------------------------------------------------------------
//  CATEGORY REGISTRY — used by the shop & store.
// ---------------------------------------------------------------------------
export const CATALOG = {
  eagle: { label: 'Eagles', items: EAGLE_SKINS },
  background: { label: 'Worlds', items: BACKGROUNDS },
  trail: { label: 'Trails', items: TRAILS },
  pillar: { label: 'Pillars', items: PILLARS },
};

export function getItem(category, id) {
  const cat = CATALOG[category];
  if (!cat) return null;
  return cat.items.find((i) => i.id === id) || cat.items[0];
}

// ---------------------------------------------------------------------------
//  REAL-MONEY COIN PACKS (Stripe Payment Links — no backend required)
//
//  HOW TO ENABLE REAL PURCHASES (see README "Real-money coins"):
//   1. Create a free Stripe account.
//   2. Make a Payment Link for each pack below.
//   3. In each link's settings, set the post-payment redirect ("Confirmation
//      page") to your game URL with ?coins=<PACK_ID>, e.g.
//         https://YOURNAME.github.io/eagle-app/?coins=medium
//   4. Paste the Payment Link URL into `url` below.
//
//  Until a `url` is set, the shop shows the pack as "Setup required".
//  NOTE: with no backend this is honor-system (a determined user could edit
//  local storage). That's expected for a static GitHub Pages game.
// ---------------------------------------------------------------------------
export const COIN_PACKS = [
  { id: 'small',  name: 'Handful',  coins: 500,   price: '$0.99', url: '' },
  { id: 'medium', name: 'Sack',     coins: 1500,  price: '$1.99', url: '' },
  { id: 'large',  name: 'Chest',    coins: 5000,  price: '$4.99', url: '' },
  { id: 'mega',   name: 'Treasury', coins: 15000, price: '$9.99', url: '' },
];

export function getCoinPack(id) {
  return COIN_PACKS.find((p) => p.id === id) || null;
}
