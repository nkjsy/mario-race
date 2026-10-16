/* ---------------- playtest fixes: battle results, Grand Prix trophies, automatic graphics quality (CrazyGames build) ---------------- */

// Battle: once the match is decided nobody can lose another balloon, so the results table always matches what the players saw
const _popBalloon = popBalloon;
popBalloon = function (k) { if (game.state !== 'race') return; _popBalloon(k); };

// Battle: a player who is out stops driving and the camera follows whoever is still in, until the match ends
const _updateBattle = updateBattle;
updateBattle = function (dt) {
  _updateBattle(dt);
  const B = game.battle; if (!B || game.demo || game.state !== 'race') return;
  for (const h of game.humansK) {
    if (!h || !h.out || h.gone) continue;
    h.gone = true;
    for (let n = 0; n < 30; n++) SMOKE.emit(h.pos.x, h.pos.y + 1, h.pos.z, (Math.random() - 0.5) * 8, Math.random() * 5, (Math.random() - 0.5) * 8, 0.8, 0.8, 0.9, 0.8, 1.6, 1, 0, 3);
    removeTrailMesh(h); scene.remove(h.m.root);
    const i = game.karts.indexOf(h); if (i >= 0) game.karts.splice(i, 1);
  }
  const alive = game.karts.filter(k => !k.out);
  if (!alive.length) return;
  game.humansK.forEach((h, n) => {
    const v = views[n]; if (!v || !h || !h.out) return;
    if (!v.kart || v.kart.out || !game.karts.includes(v.kart)) { v.kart = alive.slice().sort((a, b) => (b.balloons || 0) - (a.balloons || 0))[0]; v.init = true; }
  });
};

// Grand Prix: a trophy for the final standing, with the unlocks it opens (daily.js)
const _showPodiumPanel = showPodiumPanel;
showPodiumPanel = function () {
  _showPodiumPanel();
  try {
    const gp = game.gp; if (!gp || gp.season || !game.podium) return;
    const rank = game.podium.standings.findIndex(k => k.isPlayer) + 1;
    if (rank > 0) RET.gpDone(rank);
  } catch (e) { }
};

/* ---- graphics quality: starts high, steps down on its own when the frame rate is low ---- */
const Quality = {
  KEY: 'starkart.gfx',
  level: 0,        // 0 full, 1 smaller shadows and 1.25x pixels, 2 no glow and 1x pixels, 3 no shadows and 0.75x pixels
  manual: false,   // the player picked a level by hand: the automatic steps stop
  last: 0, n: 0, sum: 0, slow: 0, settle: 90, duo: false,
  basePR() { return Math.min(window.devicePixelRatio || 1, isTouch ? 1.25 : 1.75); },
  apply(l, force) {
    if (l === this.level && !force) return;
    this.level = l;
    let pr = this.basePR();
    if (l >= 1) {
      if (sun.shadow.mapSize.x !== 1024) { sun.shadow.mapSize.set(1024, 1024); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
      pr = Math.min(pr, 1.25);
    } else if (sun.shadow.mapSize.x !== 2048) { sun.shadow.mapSize.set(2048, 2048); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    Post.on = l < 2 && !this.duo;
    if (l >= 2) pr = Math.min(pr, 1);
    if (l >= 3) { sun.castShadow = false; pr = Math.min(pr, 0.75); }
    else if (!sun.castShadow) sun.castShadow = true;
    renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight); layoutViews();
  },
  save() { try { CGStore.setItem(this.KEY, JSON.stringify({ level: this.level, manual: this.manual })); } catch (e) { } },
  load() { try { const s = JSON.parse(CGStore.getItem(this.KEY) || 'null'); if (s) { this.manual = !!s.manual; return Math.max(0, Math.min(3, s.level | 0)); } } catch (e) { } return 0; },
  label() { return this.manual ? ['High', 'Medium', 'Low', 'Lowest'][this.level] : 'Auto' + (this.level ? ' (' + ['', 'medium', 'low', 'lowest'][this.level] + ')' : ''); },
  // measures how long frames really take (only while a race or the menu is running) and steps the quality down when it is slow
  tick(now) {
    requestAnimationFrame(t => this.tick(t));
    const dt = now - this.last; this.last = now;
    if (document.hidden || game.paused || dt > 400 || dt <= 0) { this.n = 0; this.sum = 0; return; }
    // split screen is twice the work: no glow while two players share the screen
    const duo = game.humans === 2 && !game.demo;
    if (duo !== this.duo) { this.duo = duo; this.apply(this.level, true); }
    if (this.manual) return;
    if (this.settle > 0) { this.settle--; return; }
    this.n++; this.sum += dt;
    if (this.n < 60) return;
    const avg = this.sum / this.n; this.n = 0; this.sum = 0;
    this.slow = avg > 27 ? this.slow + 1 : 0;   // under about 37 fps
    if (this.slow >= 2 && this.level < 3) {
      this.slow = 0; this.settle = 120;
      this.apply(this.level + 1); this.save();
      try { showCenter('all', 'Graphics: ' + this.label(), 1.6, false); } catch (e) { }
    }
  },
  cycle() {   // pause menu button: Auto -> Low -> Lowest -> High -> Auto
    if (!this.manual) { this.manual = true; this.apply(2); }
    else if (this.level === 2) this.apply(3);
    else if (this.level === 3) this.apply(0);
    else this.manual = false, this.settle = 90;
    this.save(); this.button();
  },
  button() { const b = document.getElementById('gfxBtn'); if (b) b.textContent = 'Graphics: ' + this.label(); },
  init() {
    const l = this.load(); this.last = performance.now();
    this.apply(l, true);
    const box = document.querySelector('#pause .btnRow');
    if (box && !document.getElementById('gfxBtn')) {
      const b = document.createElement('button'); b.id = 'gfxBtn'; b.type = 'button'; b.className = 'bigBtn alt'; b.style.cssText = 'font-size:22px;padding:8px 24px;align-self:center';
      b.onclick = () => this.cycle(); box.after(b);
    }
    this.button();
    requestAnimationFrame(t => this.tick(t));
  },
};
Quality.init();
