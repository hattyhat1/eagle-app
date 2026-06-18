// ============================================================================
//  ui.js — UIManager
//  Owns all DOM overlay UI: the big score, start menu, game-over shield panel,
//  milestone "+10!" banner, mute toggle, and star-spangled screen transitions.
// ============================================================================

export class UIManager {
  constructor({ onMuteToggle } = {}) {
    this.el = {
      score: document.getElementById('score'),
      menu: document.getElementById('menu'),
      menuBest: document.getElementById('menu-best'),
      gameover: document.getElementById('gameover'),
      goScore: document.getElementById('go-score'),
      goBest: document.getElementById('go-best'),
      goTitle: document.getElementById('go-title'),
      newRecord: document.getElementById('new-record'),
      milestone: document.getElementById('milestone'),
      mute: document.getElementById('mute'),
      transition: document.getElementById('transition'),
      flash: document.getElementById('flash'),
      intro: document.getElementById('intro'),
    };
    this.onMuteToggle = onMuteToggle || (() => {});

    this.el.mute.addEventListener('click', (e) => {
      e.stopPropagation();
      const muted = this.onMuteToggle();
      this.setMuteIcon(muted);
    });
  }

  setMuteIcon(muted) {
    this.el.mute.textContent = muted ? '🔇' : '🔊';
    this.el.mute.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
  }

  // --- Score -----------------------------------------------------------------
  showScore(show) {
    this.el.score.classList.toggle('hidden', !show);
  }

  setScore(n) {
    this.el.score.textContent = n;
  }

  popScore() {
    this.el.score.classList.remove('pop');
    // force reflow to restart animation
    void this.el.score.offsetWidth;
    this.el.score.classList.add('pop');
  }

  // --- Menu ------------------------------------------------------------------
  showMenu(best) {
    this.el.menu.classList.remove('hidden');
    this.el.menuBest.textContent = best;
    this.el.gameover.classList.add('hidden');
  }

  hideMenu() {
    this.el.menu.classList.add('hidden');
  }

  hideIntro() {
    if (this.el.intro) this.el.intro.classList.add('hidden');
  }

  // --- Milestone banner ------------------------------------------------------
  showMilestone(text = '+10!') {
    const m = this.el.milestone;
    m.textContent = text;
    m.classList.remove('show');
    void m.offsetWidth;
    m.classList.add('show');
  }

  // --- Game over -------------------------------------------------------------
  showGameOver(score, best, isNewRecord) {
    const go = this.el.gameover;
    this.el.goScore.textContent = score;
    this.el.goBest.textContent = best;
    this.el.newRecord.classList.toggle('hidden', !isNewRecord);
    this.el.goTitle.classList.toggle('hidden', isNewRecord);
    go.classList.remove('hidden', 'enter');
    void go.offsetWidth;
    go.classList.add('enter');
    if (isNewRecord) this.flash();
  }

  hideGameOver() {
    this.el.gameover.classList.add('hidden');
  }

  // --- FX --------------------------------------------------------------------
  flash() {
    const f = this.el.flash;
    f.classList.remove('go');
    void f.offsetWidth;
    f.classList.add('go');
  }

  // Star-spangled wipe between states. Calls cb at the midpoint (covered).
  transition(cb) {
    const t = this.el.transition;
    t.classList.remove('hidden');
    t.classList.remove('play');
    void t.offsetWidth;
    t.classList.add('play');
    let done = false;
    const mid = setTimeout(() => { if (!done) { done = true; cb && cb(); } }, 300);
    setTimeout(() => {
      t.classList.add('hidden');
      if (!done) { done = true; clearTimeout(mid); cb && cb(); }
    }, 650);
  }
}
