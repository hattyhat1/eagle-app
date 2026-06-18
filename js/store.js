// ============================================================================
//  store.js — PlayerStore
//  Persists the player's coins, owned cosmetics, and equipped loadout in
//  localStorage. Handles spending coins to buy items, equipping, and crediting
//  real-money coin packs via the Stripe success-redirect (?coins=<packId>).
// ============================================================================

import { CATALOG, getItem, getCoinPack } from './cosmetics.js';

const SAVE_KEY = 'americanEagle.save.v2';
const CATEGORIES = ['eagle', 'background', 'trail', 'pillar'];

export class PlayerStore {
  constructor() {
    this.data = this._load();
  }

  _defaults() {
    const owned = {};
    const equipped = {};
    for (const cat of CATEGORIES) {
      const first = CATALOG[cat].items[0]; // free default
      owned[cat] = [first.id];
      equipped[cat] = first.id;
    }
    return { coins: 0, owned, equipped, redeemed: [] };
  }

  _load() {
    const def = this._defaults();
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!raw) return def;
      // Merge defensively so new categories/items don't break old saves.
      const data = { ...def, ...raw };
      data.owned = { ...def.owned, ...(raw.owned || {}) };
      data.equipped = { ...def.equipped, ...(raw.equipped || {}) };
      data.redeemed = raw.redeemed || [];
      for (const cat of CATEGORIES) {
        // Always guarantee the free default is owned.
        const free = CATALOG[cat].items[0].id;
        if (!data.owned[cat].includes(free)) data.owned[cat].push(free);
      }
      data.coins = Math.max(0, Math.floor(data.coins || 0));
      return data;
    } catch {
      return def;
    }
  }

  save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
  }

  // --- Coins -----------------------------------------------------------------
  get coins() { return this.data.coins; }

  addCoins(n) {
    this.data.coins = Math.max(0, this.data.coins + Math.floor(n));
    this.save();
    return this.data.coins;
  }

  // --- Ownership / equip -----------------------------------------------------
  isOwned(category, id) {
    return (this.data.owned[category] || []).includes(id);
  }

  isEquipped(category, id) {
    return this.data.equipped[category] === id;
  }

  getEquipped(category) {
    return getItem(category, this.data.equipped[category]);
  }

  // Attempt to buy an item with coins. Returns 'bought' | 'owned' | 'poor'.
  buy(category, id) {
    if (this.isOwned(category, id)) return 'owned';
    const item = getItem(category, id);
    if (!item) return 'poor';
    if (this.data.coins < item.price) return 'poor';
    this.data.coins -= item.price;
    this.data.owned[category].push(id);
    this.save();
    return 'bought';
  }

  // Equip an owned item. Returns true on success.
  equip(category, id) {
    if (!this.isOwned(category, id)) return false;
    this.data.equipped[category] = id;
    this.save();
    return true;
  }

  // --- Real-money redemption -------------------------------------------------
  // Called once on load: if the URL has ?coins=<packId> from a Stripe
  // redirect, credit the coins (guarding against refresh double-credit via a
  // per-transaction id), then clean the URL. Returns the credited pack or null.
  redeemFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const packId = params.get('coins');
    if (!packId) return null;

    const pack = getCoinPack(packId);
    // Stripe appends a unique session id; use it to prevent re-credit on
    // refresh. Fall back to packId+timestamp bucket if absent.
    const txn = params.get('session_id') || params.get('txn') || `${packId}`;

    let credited = null;
    if (pack && !this.data.redeemed.includes(txn)) {
      this.addCoins(pack.coins);
      this.data.redeemed.push(txn);
      // keep the redeemed list bounded
      if (this.data.redeemed.length > 50) this.data.redeemed.shift();
      this.save();
      credited = pack;
    }

    // Clean the query string so a refresh can't reprocess it.
    const clean = window.location.origin + window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, clean);
    return credited;
  }
}
