// ============================================================================
//  shop.js — ShopUI
//  Builds the customization shop overlay (Eagles / Worlds / Trails / Pillars +
//  a real-money Coins tab) from the catalog. Handles buying with coins,
//  equipping, and launching Stripe Payment Links for coin packs.
// ============================================================================

import { CATALOG, COIN_PACKS, cssHex } from './cosmetics.js';

export class ShopUI {
  constructor(store, audio, { onEquip, onCoins } = {}) {
    this.store = store;
    this.audio = audio;
    this.onEquip = onEquip || (() => {});
    this.onCoins = onCoins || (() => {});
    this.isOpen = false;
    this.activeTab = 'eagle';

    this.root = document.getElementById('shop');
    this._buildShell();
  }

  _buildShell() {
    this.root.innerHTML = `
      <div class="shop-panel">
        <div class="shop-head">
          <h2 class="shop-title">★ SHOP ★</h2>
          <div class="shop-coins"><span class="coin-ico">◉</span><span id="shop-balance">0</span></div>
          <button class="shop-close" data-ui-button aria-label="Close">✕</button>
        </div>
        <div class="shop-tabs" id="shop-tabs"></div>
        <div class="shop-grid" id="shop-grid"></div>
        <div class="shop-toast" id="shop-toast"></div>
      </div>`;

    this.elTabs = this.root.querySelector('#shop-tabs');
    this.elGrid = this.root.querySelector('#shop-grid');
    this.elBalance = this.root.querySelector('#shop-balance');
    this.elToast = this.root.querySelector('#shop-toast');

    this.root.querySelector('.shop-close').addEventListener('click', (e) => {
      e.stopPropagation(); this.close();
    });
    // Swallow taps inside the shop so they don't reach the game input.
    this.root.addEventListener('mousedown', (e) => e.stopPropagation());
    this.root.addEventListener('touchstart', (e) => e.stopPropagation());

    const tabs = [
      ['eagle', '🦅 Eagles'], ['background', '🌅 Worlds'],
      ['trail', '✨ Trails'], ['pillar', '🏛 Pillars'], ['coins', '◉ Coins'],
    ];
    for (const [id, label] of tabs) {
      const b = document.createElement('button');
      b.className = 'shop-tab';
      b.dataset.tab = id;
      b.dataset.uiButton = '';
      b.textContent = label;
      b.addEventListener('click', (e) => { e.stopPropagation(); this._selectTab(id); });
      this.elTabs.appendChild(b);
    }
  }

  open() {
    this.isOpen = true;
    this.root.classList.remove('hidden');
    this._selectTab(this.activeTab);
    this._refreshBalance();
  }

  close() {
    this.isOpen = false;
    this.root.classList.add('hidden');
  }

  _refreshBalance() {
    this.elBalance.textContent = this.store.coins;
    this.onCoins(this.store.coins);
  }

  _toast(msg) {
    this.elToast.textContent = msg;
    this.elToast.classList.remove('show');
    void this.elToast.offsetWidth;
    this.elToast.classList.add('show');
  }

  _selectTab(tab) {
    this.activeTab = tab;
    for (const b of this.elTabs.children) b.classList.toggle('active', b.dataset.tab === tab);
    if (tab === 'coins') this._renderCoins();
    else this._renderCategory(tab);
  }

  // --- Cosmetic categories ---------------------------------------------------
  _renderCategory(category) {
    this.elGrid.innerHTML = '';
    const items = CATALOG[category].items;
    for (const item of items) {
      const owned = this.store.isOwned(category, item.id);
      const equipped = this.store.isEquipped(category, item.id);
      const card = document.createElement('div');
      card.className = 'shop-card' + (equipped ? ' equipped' : '');

      const preview = this._preview(category, item);
      let action;
      if (equipped) action = `<div class="shop-status equipped-tag">EQUIPPED</div>`;
      else if (owned) action = `<button class="shop-btn equip" data-ui-button>EQUIP</button>`;
      else action = `<button class="shop-btn buy" data-ui-button><span class="coin-ico">◉</span> ${item.price}</button>`;

      card.innerHTML = `
        <div class="shop-prev">${preview}</div>
        <div class="shop-name">${item.name}</div>
        ${action}`;

      const btn = card.querySelector('button');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (owned) this._equip(category, item);
          else this._buy(category, item);
        });
      }
      this.elGrid.appendChild(card);
    }
  }

  _equip(category, item) {
    if (this.store.equip(category, item.id)) {
      this.audio.coin();
      this.onEquip(category, item);
      this._renderCategory(category);
    }
  }

  _buy(category, item) {
    const result = this.store.buy(category, item.id);
    if (result === 'bought') {
      this.audio.purchase();
      this.store.equip(category, item.id);
      this.onEquip(category, item);
      this._toast(`Unlocked ${item.name}!`);
      this._refreshBalance();
      this._renderCategory(category);
    } else if (result === 'poor') {
      this.audio.denied();
      this._toast(`Need ${item.price - this.store.coins} more coins`);
    }
  }

  _preview(category, item) {
    if (category === 'eagle') {
      const acc = item.accessory === 'shades' ? '<div class="pv-shades"></div>'
        : item.accessory === 'tophat' ? '<div class="pv-hat"></div>' : '';
      return `<div class="pv-eagle" style="background:${cssHex(item.body)}">
                <div class="pv-head" style="background:${cssHex(item.head)}"></div>
                <div class="pv-beak" style="background:${cssHex(item.beak)}"></div>${acc}
              </div>`;
    }
    if (category === 'background') {
      return `<div class="pv-bg" style="background:linear-gradient(${cssHex(item.skyTop)},${cssHex(item.skyMid)},${cssHex(item.skyBottom)})">
                <div class="pv-sun" style="background:${cssHex(item.sun)}"></div>
                <div class="pv-ground" style="background:${cssHex(item.ground)}"></div>
              </div>`;
    }
    if (category === 'trail') {
      const dots = item.colors.map((c) => `<span class="pv-dot" style="background:${cssHex(c)}"></span>`).join('');
      return `<div class="pv-trail">${dots}</div>`;
    }
    if (category === 'pillar') {
      const map = {
        stripes: 'repeating-linear-gradient(#c8102e 0 8px,#f7f7fb 8px 16px)',
        marble: 'linear-gradient(90deg,#ece7da,#cfc7b4)',
        gold: 'linear-gradient(90deg,#ffe899,#e0a727)',
        candy: 'repeating-linear-gradient(45deg,#c8102e 0 8px,#f7f7fb 8px 16px)',
        neon: 'linear-gradient(#0d1b4c,#39e6ff)',
      };
      return `<div class="pv-pillar" style="background:${map[item.type] || map.stripes}"></div>`;
    }
    return '';
  }

  // --- Coins (real money) ----------------------------------------------------
  _renderCoins() {
    this.elGrid.innerHTML = '';
    const note = document.createElement('div');
    note.className = 'shop-note';
    note.innerHTML = `Buy coin packs to unlock skins faster. Earn coins free by
      grabbing them mid-flight too!`;
    this.elGrid.appendChild(note);

    for (const pack of COIN_PACKS) {
      const card = document.createElement('div');
      card.className = 'shop-card coin-card';
      const configured = !!pack.url;
      card.innerHTML = `
        <div class="shop-prev pv-pack"><span class="coin-ico big">◉</span><div class="pack-amt">${pack.coins.toLocaleString()}</div></div>
        <div class="shop-name">${pack.name}</div>
        <button class="shop-btn ${configured ? 'buy' : 'setup'}" data-ui-button>
          ${configured ? pack.price : 'Setup needed'}
        </button>`;
      const btn = card.querySelector('button');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (configured) {
          window.location.href = pack.url; // Stripe Payment Link
        } else {
          this._toast('Add your Stripe link in js/cosmetics.js — see README');
        }
      });
      this.elGrid.appendChild(card);
    }
  }
}
