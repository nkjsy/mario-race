
/* ---------------- daily bonus, daily challenge, next race and unlock progress (CrazyGames build) ---------------- */
const RET = {
  KEY: 'starkart.daily',
  BONUS: [5, 8, 10, 12, 15, 20, 30],   // day 1..7 of a streak; day 8 and later keep the last value
  CH_REWARD: 25,   // a bit more than one average race
  // easy one-race-or-two tasks; picked by date so everyone gets the same one each day
  CHALLENGES: [
    { id: 'finish1', text: 'Finish 1 race', goal: 1 },
    { id: 'finish2', text: 'Finish 2 races', goal: 2 },
    { id: 'top5', text: 'Finish a race in the top 5', goal: 1 },
    { id: 'coins10', text: 'Collect 10 coins on the track', goal: 10 },
    { id: 'battle1', text: 'Play 1 Battle game', goal: 1 },
    { id: 'gp1', text: 'Finish 1 Grand Prix race', goal: 1 },
    { id: 'tt1', text: 'Finish 1 Time Trial', goal: 1 },
  ],
  d: null,
  today(off = 0) { const t = new Date(Date.now() + off * 864e5); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); },
  load() {
    try { this.d = JSON.parse(CGStore.getItem(this.KEY) || 'null'); } catch (e) { this.d = null; }
    if (!this.d || typeof this.d !== 'object') this.d = { last: '', streak: 0, ch: null };
  },
  store() { try { CGStore.setItem(this.KEY, JSON.stringify(this.d)); } catch (e) { } },
  challenge() {
    const day = this.today();
    if (!this.d.ch || this.d.ch.date !== day) {
      let h = 0; for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      this.d.ch = { date: day, id: this.CHALLENGES[h % this.CHALLENGES.length].id, prog: 0, done: false };
      this.store();
    }
    const c = this.CHALLENGES.find(x => x.id === this.d.ch.id) || this.CHALLENGES[0];
    return { ...c, prog: Math.min(this.d.ch.prog, c.goal), done: this.d.ch.done };
  },
  bonusFor(streak) { return this.BONUS[Math.min(streak, this.BONUS.length) - 1]; },
  // adds coins the same way race winnings do, and names any part that unlocks
  give(n) {
    const before = save.coins; save.coins += n; saveAll();
    const fresh = []; for (const kind in PARTS) for (const pt of PARTS[kind]) if (pt.need > before && pt.need <= save.coins) fresh.push(pt.name);
    try { buildGarage(); showStats(); } catch (e) { }
    return fresh;
  },
  nextUnlock() {
    let best = null, prev = 0;
    for (const kind in PARTS) for (const pt of PARTS[kind]) {
      if (pt.need > save.coins && (!best || pt.need < best.need)) best = pt;
      if (pt.need <= save.coins && pt.need > prev) prev = pt.need;
    }
    return best ? { pt: best, prev, left: best.need - save.coins } : null;
  },
  unlockHtml() {
    const u = this.nextUnlock();
    if (!u) return '<div class="retRow">🏆 Every part is unlocked!</div>';
    const pct = Math.round(100 * (save.coins - u.prev) / (u.pt.need - u.prev));
    return `<div class="retRow">🔓 Next unlock: <b>${esc(u.pt.name)}</b> · ${u.left} 🪙 to go<div class="retBar"><i style="width:${pct}%"></i></div></div>`;
  },
  chHtml(justDone) {
    const c = this.challenge();
    if (justDone) return `<div class="retRow retDone">🎯 Daily challenge complete! <b>+${this.CH_REWARD} 🪙</b>${this.fresh && this.fresh.length ? ' · Unlocked: ' + esc(this.fresh.join(', ')) + '!' : ''}</div>`;
    if (c.done) return '<div class="retRow">🎯 Daily challenge done. A new one comes tomorrow!</div>';
    return `<div class="retRow">🎯 Daily challenge: ${c.text} <b>${c.prog}/${c.goal}</b> · reward ${this.CH_REWARD} 🪙</div>`;
  },
  menuLine() {
    const el = document.getElementById('retMenu'); if (!el) return;
    const c = this.challenge();
    el.textContent = c.done ? '🎯 Daily challenge done · come back tomorrow!' : `🎯 Today: ${c.text} (${c.prog}/${c.goal}) · +${this.CH_REWARD} 🪙`;
  },
  // first visit of the day: streak bonus popup
  init() {
    this.load();
    const logo = document.querySelector('#menu .logo');
    if (logo && !document.getElementById('retMenu')) { const p = document.createElement('p'); p.id = 'retMenu'; logo.after(p); }
    const day = this.today();
    if (this.d.last !== day) {
      this.d.streak = this.d.last === this.today(-1) ? this.d.streak + 1 : 1;
      this.d.last = day; this.store();
      this.popup(this.d.streak);
    }
    this.challenge(); this.menuLine();
  },
  popup(streak) {
    const amt = this.bonusFor(streak), fresh = this.give(amt);
    const box = document.createElement('div'); box.id = 'daily'; box.className = 'overlay';
    let cells = '';
    for (let i = 1; i <= 7; i++) {
      const dayNo = streak <= 7 ? i : streak - 7 + i, cls = dayNo < streak ? 'past' : dayNo === streak ? 'now' : '';
      cells += `<div class="dCell ${cls}"><small>Day ${dayNo}</small><b>${this.bonusFor(dayNo)}</b><span>${dayNo < streak ? '✔' : '🪙'}</span></div>`;
    }
    const c = this.challenge();
    box.innerHTML = `<div class="panel"><h2 class="resTitle">${streak > 1 ? 'Day ' + streak + ' in a row!' : 'Daily bonus'}</h2>
      <div class="dStrip">${cells}</div>
      <p class="dGot">+${amt} 🪙${fresh.length ? ' · Unlocked: ' + esc(fresh.join(', ')) + '!' : ''}</p>
      <p class="dCh">🎯 Today's challenge: <b>${c.text}</b> · reward ${this.CH_REWARD} 🪙</p>
      <p class="dTip">Come back tomorrow for +${this.bonusFor(streak + 1)} 🪙. The bonus grows every day you play in a row.</p>
      <div class="btnRow"><button class="bigBtn" id="dailyOk" type="button">Collect!</button></div></div>`;
    document.body.appendChild(box);
    try { Snd.init(); Snd.sfx('coin'); } catch (e) { }
    box.querySelector('#dailyOk').onclick = () => box.remove();
  },
  // called at the end of showResults
  results() {
    if (!this.d) this.load();
    const h = game.humansK && game.humansK[0];
    let justDone = false;
    if (h && !game.retCounted) {
      game.retCounted = true;
      const c = this.challenge(), ch = this.d.ch, battle = game.mode === 'battle';
      if (!ch.done) {
        if (c.id === 'finish1' || c.id === 'finish2') { if (!battle && h.finished) ch.prog++; }
        else if (c.id === 'top5') { if (!battle && game.mode !== 'tt' && h.finished && h.finishRank <= 5) ch.prog++; }
        else if (c.id === 'coins10') ch.prog += h.coinsGot || 0;
        else if (c.id === 'battle1') { if (battle) ch.prog++; }
        else if (c.id === 'gp1') { if (game.mode === 'gp' && h.finished) ch.prog++; }
        else if (c.id === 'tt1') { if (game.mode === 'tt' && h.finished) ch.prog++; }
        if (ch.prog >= c.goal) { ch.done = true; justDone = true; }
        this.store();
        if (justDone) this.fresh = this.give(this.CH_REWARD);
      }
    }
    let box = document.getElementById('retBox');
    if (!box) { box = document.createElement('div'); box.id = 'retBox'; $('resTable').before(box); }
    box.innerHTML = this.chHtml(justDone) + this.unlockHtml();
    this.menuLine();
    // single race: suggest the next course in the same group as the main button
    let nb = document.getElementById('nextBtn');
    if (!nb) {
      nb = document.createElement('button'); nb.id = 'nextBtn'; nb.className = 'bigBtn'; nb.type = 'button';
      $('againBtn').before(nb);
      nb.onclick = () => CG.midgame(() => { game.courseIdx = this.nextCourse(); saveAll(); startRace(); });
    }
    const show = game.mode === 'single';
    nb.hidden = !show; $('againBtn').classList.toggle('alt', show);
    if (show) nb.textContent = 'Next: ' + COURSES[this.nextCourse()].name + ' ▶';
  },
  nextCourse() {
    const i = game.courseIdx, k = COURSES.findIndex(c => c.battle);   // kart courses come before the arena, classic ones after it
    if (i < k) return (i + 1) % k;
    return k + 1 + (i - k) % (COURSES.length - k - 1);
  },
};
