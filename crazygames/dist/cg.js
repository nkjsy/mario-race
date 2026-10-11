/* ---------------- CrazyGames SDK adapter ----------------
   Everything here is a no-op when the SDK is missing (ad blocker, opened from disk,
   or any site other than CrazyGames), so the game always runs. */
const CG = {
  sdk: null, playing: false, adActive: false, userMute: false,
  ready() { return !!this.sdk; },
  // called by index.html once SDK init has finished (or failed)
  attach(sdk) {
    if (!sdk) return;
    this.sdk = sdk;
    try { sdk.game.addSettingsChangeListener(() => this.applyMute()); } catch (e) { }
  },
  loaded() { if (this.sdk) try { this.sdk.game.loadingStop(); } catch (e) { } this.applyMute(); },
  // gameplayStart while a race or battle is actually running, gameplayStop on every break
  tick() {
    const on = !game.paused && !game.demo && !this.adActive && (game.state === 'countdown' || game.state === 'race' || game.state === 'finish');
    if (on === this.playing) return;
    this.playing = on;
    if (this.sdk) try { on ? this.sdk.game.gameplayStart() : this.sdk.game.gameplayStop(); } catch (e) { }
  },
  platformMute() { try { return !!(this.sdk && this.sdk.game.settings && this.sdk.game.settings.muteAudio); } catch (e) { return false; } },
  applyMute() {
    const m = this.userMute || this.adActive || this.platformMute();
    if (typeof Snd !== 'undefined') Snd.setMuted(m);
    const b = document.getElementById('muteBtn'); if (b) b.textContent = (this.userMute || this.platformMute()) ? '×' : '♪';
  },
  // midgame ad between races; `next` always runs, whether an ad played, failed or was skipped
  midgame(next) {
    if (!this.sdk) { next(); return; }
    const block = document.getElementById('adBlock'); block.hidden = false;
    let done = false;
    const finish = () => { if (done) return; done = true; this.adActive = false; block.hidden = true; this.applyMute(); next(); };
    try {
      this.sdk.ad.requestAd('midgame', {
        adStarted: () => { if (done) return; this.adActive = true; this.applyMute(); this.tick(); },
        adFinished: finish,
        adError: finish,
      });
    } catch (e) { finish(); }
    setTimeout(() => { if (!this.adActive) finish(); }, 8000); // never leave the player stuck if no callback comes
  },
};
// Progress save: the SDK data module (synced to the player's CrazyGames account) with a localStorage fallback.
const CGStore = {
  s() { try { if (CG.sdk && CG.sdk.data) return CG.sdk.data; } catch (e) { } return localStorage; },
  getItem(k) { try { return this.s().getItem(k); } catch (e) { return localStorage.getItem(k); } },
  setItem(k, v) { try { this.s().setItem(k, v); } catch (e) { localStorage.setItem(k, v); } },
  removeItem(k) { try { this.s().removeItem(k); } catch (e) { localStorage.removeItem(k); } },
};
CG.attach(window.__cgSdk);
// iOS suspends audio when the app is backgrounded; it can only be resumed from a user gesture
['touchend', 'click'].forEach(ev => addEventListener(ev, () => { if (typeof Snd !== 'undefined' && Snd.ctx && Snd.ctx.state !== 'running' && !game.paused) Snd.ctx.resume(); }, { passive: true }));
const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
