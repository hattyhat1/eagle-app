// ============================================================================
//  main.js — Entry point
//  Boots the GameManager once the DOM is ready.
// ============================================================================

import { GameManager } from './game.js';

function boot() {
  const canvas = document.getElementById('game-canvas');
  // Expose for debugging / tuning in the console.
  window.game = new GameManager(canvas);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
