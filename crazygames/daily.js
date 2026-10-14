
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
    try { buildGarage(); showStats(); if (document.getElementById('cardBar')) this.cardBar(); } catch (e) { }
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
    const show = game.mode === 'single' && this.nextCourse() !== game.courseIdx;
    nb.hidden = !show; $('againBtn').classList.toggle('alt', show);
    if (show) nb.textContent = 'Next: ' + COURSES[this.nextCourse()].name + ' ▶';
  },
  // next course in the same group (kart or classic) that the player can race today
  nextCourse() {
    const k = COURSES.findIndex(c => c.battle);   // kart courses come before the arena, classic ones after it
    const step = i => i < k ? (i + 1) % k : k + 1 + (i - k) % (COURSES.length - k - 1);
    let i = step(game.courseIdx);
    for (let n = 0; n < COURSES.length && !this.avail(i); n++) i = step(i);
    return i;
  },

  /* ---- daily free tracks and Star Passes (a pass opens every track for 24 h) ---- */
  CARD_PRICE: 120,
  CARD_HOURS: 24,
  FREE_CLASSIC: 5,
  dayNo() { const t = new Date(); return Math.floor(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 864e5); },
  // one whole kart cup (so Grand Prix always works) plus a few classic circuits, the same for everyone each day
  freeToday() {
    const day = this.dayNo();
    if (this._free && this._free.day === day) return this._free.set;
    const set = new Set(CUPS[day % CUPS.length].courses);
    const classic = COURSES.map((c, i) => c.classic ? i : -1).filter(i => i >= 0);
    let h = day * 2654435761 >>> 0;
    for (let n = 0; n < this.FREE_CLASSIC && classic.length; n++) { h = (h * 1103515245 + 12345) >>> 0; set.add(classic.splice(h % classic.length, 1)[0]); }
    this._free = { day, set };
    return set;
  },
  cards() { if (!this.d) this.load(); if (this.d.cards === undefined) { this.d.cards = 1; this.store(); } return this.d.cards; },   // the first pass is free
  allOpen() { if (!this.d) this.load(); return (this.d.cardUntil || 0) > Date.now(); },
  avail(i) { return !!COURSES[i].battle || this.allOpen() || this.freeToday().has(i); },
  cupOpen(i) { const c = cupOf(i); return c >= 0 && CUPS[c].courses.every(x => this.avail(x)); },
  // coins to spend: parts unlock by total coins earned, so buying a pass never locks a part again
  wallet() { if (!this.d) this.load(); return Math.max(0, save.coins - (this.d.spent || 0)); },
  canStart() {
    if (game.mode === 'battle') return true;
    return game.mode === 'gp' ? this.cupOpen(game.courseIdx) : this.avail(game.courseIdx);
  },
  locks() {
    if (!this.d) this.load();
    const gp = game.mode === 'gp', free = this.freeToday(), open = this.allOpen();
    for (const b of $('courses').children) {
      const i = +b.dataset.ci;
      if (!b.dataset.html) b.dataset.html = b.innerHTML;
      const ok = gp ? this.cupOpen(i) : this.avail(i);
      b.disabled = game.mode === 'battle' || !ok;
      b.innerHTML = (ok ? (open ? '' : '<span class="tag">FREE TODAY</span>') : '<span class="tag lock">🔒 LOCKED</span>') + b.dataset.html;
      if (!free.has(i) && open) b.innerHTML = b.dataset.html;
    }
    // a course picked on an earlier day may be locked now: move to today's free cup
    if (game.mode !== 'battle' && !this.canStart()) {
      const i = CUPS[this.dayNo() % CUPS.length].courses[0];
      game.courseIdx = i; saveAll();
      for (const b of $('courses').children) b.setAttribute('aria-pressed', +b.dataset.ci === i);
      buildCourse(i); startDemo();
    }
    this.cardBar();
  },
  cardBar() {
    let bar = document.getElementById('cardBar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'cardBar'; $('ctabs').before(bar); }
    const n = this.cards(), w = this.wallet();
    if (this.allOpen()) {
      const left = this.d.cardUntil - Date.now(), h = Math.floor(left / 36e5), m = Math.floor(left / 6e4) % 60;
      bar.innerHTML = `🎫 <b>Star Pass active: every track open</b> · ${h}h ${m}m left · passes: ${n} · ${w} 🪙 to spend`;
      return;
    }
    bar.innerHTML = `🎫 Free today: <b>${esc(CUPS[this.dayNo() % CUPS.length].name)}</b> + ${this.FREE_CLASSIC} classic tracks · Star Passes: <b>${n}</b> · ${w} 🪙 to spend `
      + `<button class="opt" type="button" id="cardUse"${n ? '' : ' disabled'}>Use a Star Pass: every track for ${this.CARD_HOURS}h</button>`
      + `<button class="opt" type="button" id="cardBuy"${w >= this.CARD_PRICE ? '' : ' disabled'}>Buy Star Pass · ${this.CARD_PRICE} 🪙</button>`;
    bar.querySelector('#cardUse').onclick = () => { if (!this.d.cards) return; this.d.cards--; this.d.cardUntil = Date.now() + this.CARD_HOURS * 36e5; this.store(); refreshMode(); };
    bar.querySelector('#cardBuy').onclick = () => { if (this.wallet() < this.CARD_PRICE) return; this.d.spent = (this.d.spent || 0) + this.CARD_PRICE; this.d.cards = this.cards() + 1; this.store(); this.cardBar(); try { buildGarage(); } catch (e) { } };
  },
};
