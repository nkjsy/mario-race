/* ---------------- daily bonus, quests, trophies, unlocks, next race (CrazyGames build) ---------------- */
const RET = {
  KEY: 'starkart.daily',
  BONUS: [5, 8, 10, 12, 15, 20, 30],   // day 1..7 of a streak; day 8 and later keep the last value
  CH_REWARD: 25,   // a bit more than one average race
  // quest slots: an easy daily task, a harder daily task and a weekly task
  SLOTS: {
    ch: { reward: 25, label: '🎯 Daily' },
    ch2: { reward: 60, label: '⭐ Daily+' },
    wk: { reward: 120, label: '📅 Weekly' },
  },
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
  HARD: [
    { id: 'win1', text: 'Win a race', goal: 1 },
    { id: 'top3x2', text: 'Finish top 3 in 2 races', goal: 2 },
    { id: 'coins25', text: 'Collect 25 coins on the track', goal: 25 },
    { id: 'gpfin', text: 'Finish a whole Grand Prix', goal: 1 },
    { id: 'finish4', text: 'Finish 4 races', goal: 4 },
  ],
  WEEKLY: [
    { id: 'races12', text: 'Finish 12 races this week', goal: 12, reward: 100 },
    { id: 'wins3', text: 'Win 3 races this week', goal: 3, reward: 120 },
    { id: 'gp2', text: 'Finish 2 Grand Prix this week', goal: 2, reward: 120 },
  ],
  // drivers beyond the first four unlock by total coins earned
  CHAR_NEED: [0, 0, 0, 0, 100, 250, 500, 800],
  d: null,
  today(off = 0) { const t = new Date(Date.now() + off * 864e5); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); },
  dayIdx(s) { const [y, m, d] = s.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 864e5); },
  weekKey() { const n = this.dayIdx(this.today()), mon = n - ((n + 3) % 7); return 'w' + mon; },   // weeks start on Monday
  hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; },
  load() {
    try { this.d = JSON.parse(CGStore.getItem(this.KEY) || 'null'); } catch (e) { this.d = null; }
    if (!this.d || typeof this.d !== 'object') this.d = { last: '', streak: 0, ch: null };
    if (!this.d.trophy) this.d.trophy = {};
    if (this.d.races === undefined) this.d.races = 0;
    if (this.d.freeze === undefined) this.d.freeze = 1;
    if (!this.d.chars) this.d.chars = CHARS.map((c, i) => i).filter(i => this.CHAR_NEED[i] <= save.coins);
  },
  store() { try { CGStore.setItem(this.KEY, JSON.stringify(this.d)); } catch (e) { } },

  /* ---- quests ---- */
  list(slot) { return slot === 'ch' ? this.CHALLENGES : slot === 'ch2' ? this.HARD : this.WEEKLY; },
  period(slot) { return slot === 'wk' ? this.weekKey() : this.today(); },
  quest(slot) {
    const per = this.period(slot), L = this.list(slot);
    if (!this.d[slot] || this.d[slot].date !== per) {
      this.d[slot] = { date: per, id: L[this.hash(per + slot) % L.length].id, prog: 0, done: false };
      this.store();
    }
    const c = L.find(x => x.id === this.d[slot].id) || L[0];
    return { slot, ...c, reward: c.reward || this.SLOTS[slot].reward, prog: Math.min(this.d[slot].prog, c.goal), done: this.d[slot].done };
  },
  challenge() { return this.quest('ch'); },
  // how much one finished race moves a quest
  step(id, e) {
    switch (id) {
      case 'finish1': case 'finish2': case 'finish4': case 'races12': return e.finished && !e.battle ? 1 : 0;
      case 'top5': return !e.battle && e.mode !== 'tt' && e.finished && e.rank <= 5 ? 1 : 0;
      case 'top3x2': return !e.battle && e.mode !== 'tt' && e.finished && e.rank <= 3 ? 1 : 0;
      case 'win1': case 'wins3': return !e.battle && e.mode !== 'tt' && e.finished && e.rank === 1 ? 1 : 0;
      case 'coins10': case 'coins25': return e.coins || 0;
      case 'battle1': return e.battle ? 1 : 0;
      case 'gp1': return e.mode === 'gp' && e.finished ? 1 : 0;
      case 'tt1': return e.mode === 'tt' && e.finished ? 1 : 0;
      case 'gpfin': case 'gp2': return e.gpDone ? 1 : 0;
    }
    return 0;
  },
  // adds progress for a finished race (or a finished Grand Prix); returns the quests that just completed
  track(e) {
    const done = [];
    for (const slot of ['ch', 'ch2', 'wk']) {
      const q = this.quest(slot), s = this.d[slot];
      if (s.done) continue;
      s.prog += this.step(q.id, e);
      if (s.prog >= q.goal) { s.done = true; done.push({ slot, text: q.text, reward: q.reward }); }
    }
    this.store();
    let fresh = [];
    for (const x of done) fresh = fresh.concat(this.give(x.reward));
    this.fresh = fresh;
    return done;
  },

  bonusFor(streak) { return this.BONUS[Math.min(streak, this.BONUS.length) - 1]; },
  // adds coins the same way race winnings do, and names any part or driver that unlocks
  give(n) {
    const before = save.coins; save.coins += n; saveAll();
    const fresh = []; for (const kind in PARTS) for (const pt of PARTS[kind]) if (pt.need > before && pt.need <= save.coins) fresh.push(pt.name);
    try { buildGarage(); showStats(); if (document.getElementById('cardBar')) this.cardBar(); } catch (e) { }
    return fresh;
  },
  // drivers that have just come within reach (compared with what the player has already seen)
  newChars() {
    if (!this.d) this.load();
    const out = [];
    CHARS.forEach((c, i) => { if (this.CHAR_NEED[i] <= save.coins && !this.d.chars.includes(i)) { this.d.chars.push(i); out.push(c.name); } });
    if (out.length) this.store();
    return out;
  },
  charOpen(i) { return save.coins >= (this.CHAR_NEED[i] || 0); },
  nextUnlock() {
    let best = null, prev = 0;
    const items = [];
    for (const kind in PARTS) for (const pt of PARTS[kind]) items.push({ name: pt.name, need: pt.need });
    CHARS.forEach((c, i) => { if (this.CHAR_NEED[i]) items.push({ name: 'driver ' + c.name, need: this.CHAR_NEED[i] }); });
    for (const pt of items) {
      if (pt.need > save.coins && (!best || pt.need < best.need)) best = pt;
      if (pt.need <= save.coins && pt.need > prev) prev = pt.need;
    }
    return best ? { pt: best, prev, left: best.need - save.coins } : null;
  },
  unlockHtml() {
    const u = this.nextUnlock();
    if (!u) return '<div class="retRow">🏆 Every part and driver is unlocked!</div>';
    const pct = Math.round(100 * (save.coins - u.prev) / (u.pt.need - u.prev));
    return `<div class="retRow retWide">🔓 Next unlock: <b>${esc(u.pt.name)}</b> · ${u.left} 🪙 to go<div class="retBar"><i style="width:${pct}%"></i></div></div>`;
  },
  questRow(slot, just) {
    const q = this.quest(slot), lab = this.SLOTS[slot].label;
    if (just) return `<div class="retRow retDone">${lab} complete! <b>+${q.reward} 🪙</b> · ${q.text}</div>`;
    if (q.done) return `<div class="retRow">${lab} done ✔ · ${q.text}</div>`;
    return `<div class="retRow">${lab}: ${q.text} <b>${q.prog}/${q.goal}</b> · +${q.reward} 🪙</div>`;
  },
  chHtml(justDone) {
    return ['ch', 'ch2', 'wk'].map(s => this.questRow(s, justDone.some(x => x.slot === s))).join('');
  },
  menuLine() {
    const el = document.getElementById('retMenu'); if (!el) return;
    const c = this.quest('ch'), c2 = this.quest('ch2'), w = this.quest('wk');
    const t = q => q.done ? '✔' : `${q.prog}/${q.goal}`;
    el.innerHTML = (c.done ? '🎯 Daily done' : `🎯 ${c.text} (${t(c)}) · +${c.reward} 🪙`)
      + `<small>⭐ ${c2.text} (${t(c2)}) · +${c2.reward} 🪙 &nbsp;|&nbsp; 📅 ${w.text} (${t(w)}) · +${w.reward} 🪙</small>`;
  },
  // first visit of the day: streak bonus popup
  init() {
    this.load();
    const logo = document.querySelector('#menu .logo');
    if (logo && !document.getElementById('retMenu')) { const p = document.createElement('p'); p.id = 'retMenu'; logo.after(p); }
    const day = this.today();
    let saved = false;
    if (this.d.last !== day) {
      const gap = this.d.last ? this.dayIdx(day) - this.dayIdx(this.d.last) : 99;
      if (gap === 1) this.d.streak++;
      else if (gap === 2 && this.d.freeze > 0 && this.d.streak >= 2) { this.d.streak++; this.d.freeze--; saved = true; }   // one missed day is forgiven by a streak freeze
      else this.d.streak = 1;
      if (this.d.streak % 7 === 0) this.d.freeze = Math.min(2, this.d.freeze + 1);   // a freeze is earned every 7 days in a row
      this.d.last = day; this.store();
      this.popup(this.d.streak, saved);
    }
    this.quest('ch'); this.quest('ch2'); this.quest('wk'); this.menuLine();
    this.newChars();
  },
  popup(streak, saved) {
    const amt = this.bonusFor(streak), fresh = this.give(amt);
    const box = document.createElement('div'); box.id = 'daily'; box.className = 'overlay';
    let cells = '';
    for (let i = 1; i <= 7; i++) {
      const dayNo = streak <= 7 ? i : streak - 7 + i, cls = dayNo < streak ? 'past' : dayNo === streak ? 'now' : '';
      cells += `<div class="dCell ${cls}"><small>Day ${dayNo}</small><b>${this.bonusFor(dayNo)}</b><span>${dayNo < streak ? '✔' : '🪙'}</span></div>`;
    }
    const c = this.quest('ch'), c2 = this.quest('ch2');
    box.innerHTML = `<div class="panel"><h2 class="resTitle">${streak > 1 ? 'Day ' + streak + ' in a row!' : 'Daily bonus'}</h2>
      <div class="dStrip">${cells}</div>
      <p class="dGot">+${amt} 🪙${fresh.length ? ' · Unlocked: ' + esc(fresh.join(', ')) + '!' : ''}</p>
      ${saved ? '<p class="dCh">🧊 You missed a day, but a streak freeze kept your streak alive!</p>' : ''}
      <p class="dCh">🎯 Today: <b>${c.text}</b> · ${c.reward} 🪙 &nbsp;⭐ <b>${c2.text}</b> · ${c2.reward} 🪙</p>
      <p class="dTip">Come back tomorrow for +${this.bonusFor(streak + 1)} 🪙. Miss a day? A streak freeze (${this.d.freeze} left) saves your streak once. You earn one every 7 days.</p>
      <div class="btnRow"><button class="bigBtn" id="dailyOk" type="button">Collect!</button></div></div>`;
    document.body.appendChild(box);
    try { Snd.init(); Snd.sfx('coin'); } catch (e) { }
    box.querySelector('#dailyOk').onclick = () => box.remove();
  },
  // called at the end of showResults
  results() {
    if (!this.d) this.load();
    const h = game.humansK && game.humansK[0];
    let just = [], chars = [];
    if (h && !game.retCounted) {
      game.retCounted = true;
      this.d.races++;
      just = this.track({ mode: game.mode, battle: game.mode === 'battle', finished: !!h.finished, rank: h.finishRank, coins: h.coinsGot || 0 });
      chars = this.newChars();
      this.store();
      this.lastJust = just; this.lastChars = chars;
    } else { just = this.lastJust || []; chars = this.lastChars || []; }
    const sc = document.getElementById('resScroll');   // the scrolling results area is created by showResults
    let box = document.getElementById('retBox');
    if (!box) { box = document.createElement('div'); box.id = 'retBox'; sc.prepend(box); }
    const extra = (this.fresh && this.fresh.length ? `<div class="retRow retDone retWide">🔓 Unlocked: ${esc(this.fresh.join(', '))}!</div>` : '') + (chars.length ? `<div class="retRow retDone retWide">🔓 New driver: ${esc(chars.join(', '))}!</div>` : '');
    const pass = !this.allOpen() && this.wallet() >= this.CARD_PRICE ? `<div class="retRow retWide">🎫 You have ${this.wallet()} 🪙 to spend: a Star Pass (${this.CARD_PRICE} 🪙) opens every track for ${this.CARD_HOURS}h. Find it in the menu under Course.</div>` : '';
    box.innerHTML = extra + this.chHtml(just) + this.unlockHtml() + pass;
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
  // the number of laps for the race that is about to start: the very first race is one quick lap
  lapsFor(n) {
    if (!this.d) this.load();
    return game.mode === 'single' && !game.gp && this.d.races === 0 ? 1 : n;
  },
  // next course in the same group (kart or classic) that the player can race today
  nextCourse() {
    const k = COURSES.findIndex(c => c.battle);   // kart courses come before the arena, classic ones after it
    const step = i => i < k ? (i + 1) % k : k + 1 + (i - k) % (COURSES.length - k - 1);
    let i = step(game.courseIdx);
    for (let n = 0; n < COURSES.length && !this.avail(i); n++) i = step(i);
    return i;
  },

  /* ---- Grand Prix trophies and what they unlock ---- */
  TROPHY: ['—', '🥉', '🥈', '🥇'],
  trophyOf(cup, cls) { if (!this.d) this.load(); return this.d.trophy[cup + '-' + cls] || 0; },
  anyTrophy(minCls = 0, min = 1) { if (!this.d) this.load(); return Object.entries(this.d.trophy).some(([k, v]) => v >= min && +k.split('-')[1] >= minCls); },
  // 150cc: a Grand Prix podium (or 300 coins earned); 200cc: a Grand Prix gold at 150cc (or 800 coins); mirror: any gold (or 500 coins)
  CLS_NEED: [null, null, 'podium in a Grand Prix · or 300 🪙', 'gold in a Grand Prix at 150cc · or 800 🪙'],
  clsOpen(i) {
    if (i <= 1) return true;
    if (i === 2) return this.anyTrophy(1, 1) || save.coins >= 300;
    return this.anyTrophy(2, 3) || save.coins >= 800;
  },
  mirrorOpen() { return this.anyTrophy(0, 3) || save.coins >= 500; },
  // called when a Grand Prix ends: rank is the player's final standing (1-based)
  gpDone(rank) {
    if (!this.d) this.load();
    const cup = game.gp && game.gp.cup || 0, cls = game.classIdx, v = rank <= 3 ? 4 - rank : 0;
    const key = cup + '-' + cls, old = this.d.trophy[key] || 0;
    const msgs = [];
    const beforeCls = [1, 2, 3].map(i => this.clsOpen(i)), beforeMirror = this.mirrorOpen();
    if (v > old) { this.d.trophy[key] = v; msgs.push(`${this.TROPHY[v]} ${['', 'Bronze', 'Silver', 'Gold'][v]} trophy · ${CUPS[cup].name} · ${CLASSES[cls].name}!`); }
    this.store();
    this.track({ mode: 'gp', gpDone: true, finished: false, rank });
    const bonus = v > old ? [0, 25, 40, 60][v] : 0;
    if (bonus) { this.fresh = (this.fresh || []).concat(this.give(bonus)); msgs.push(`+${bonus} 🪙`); }
    [1, 2, 3].forEach((i, n) => { if (!beforeCls[n] && this.clsOpen(i)) msgs.push(`🔓 ${CLASSES[i].name} unlocked!`); });
    if (!beforeMirror && this.mirrorOpen()) msgs.push('🔓 Mirror mode unlocked!');
    if (!msgs.length && v) msgs.push(`Your best here is already ${this.TROPHY[old]}. Aim higher!`);
    if (!v) msgs.push('Finish top 3 in a Grand Prix to win a trophy.');
    const sub = $('resSub'); sub.textContent = (sub.textContent ? sub.textContent + ' · ' : '') + msgs.join(' · ');
    this.menuLine();
  },
  trophyHtml() {
    let h = '🏆 <b>Trophies</b> ';
    CUPS.forEach((cp, c) => { h += `<span class="tCup">${esc(cp.name)} ` + CLASSES.map((cl, i) => `<i title="${cl.name}">${this.TROPHY[this.trophyOf(c, i)]}</i>`).join('') + '</span>'; });
    return h + '<small> 50cc · 100cc · 150cc · 200cc</small>';
  },
  // locks on classes, mirror and drivers; called after every menu refresh
  gate() {
    if (!this.d) this.load();
    const clw = document.getElementById('classes');
    if (clw) [...clw.children].forEach((b, i) => {
      if (!b.dataset.html) b.dataset.html = b.innerHTML;
      const ok = this.clsOpen(i);
      b.disabled = !ok;
      b.innerHTML = ok ? b.dataset.html : (b.dataset.html.replace(/<small>.*<\/small>/, '') + `<small>🔒 ${this.CLS_NEED[i]}</small>`);
    });
    const mb = document.getElementById('mirrorBtn');
    if (mb) {
      if (!mb.dataset.html) mb.dataset.html = mb.innerHTML;
      const ok = this.mirrorOpen(); mb.disabled = !ok;
      mb.innerHTML = ok ? mb.dataset.html : mb.dataset.html.replace(/<small>.*<\/small>/, '<small>🔒 gold in a Grand Prix · or 500 🪙</small>');
      if (!ok && game.mirror) { game.mirror = false; mb.setAttribute('aria-pressed', false); }
    }
    for (const b of document.querySelectorAll('#chars .char')) {
      const i = +b.id.slice(4), ok = this.charOpen(i);
      b.disabled = !ok;
      let lk = b.querySelector('.lockTag');
      if (!ok && !lk) { lk = document.createElement('span'); lk.className = 'lockTag'; b.appendChild(lk); }
      if (lk) { if (ok) lk.remove(); else lk.textContent = '🔒 ' + this.CHAR_NEED[i] + ' 🪙'; }
    }
    let fix = false;
    if (!this.clsOpen(game.classIdx)) { game.classIdx = [3, 2, 1].find(i => this.clsOpen(i)) || 1; fix = true; }
    if (!this.charOpen(game.charIdx)) { game.charIdx = 0; fix = true; }
    if (!this.charOpen(game.charIdx2) || game.charIdx2 === game.charIdx) { game.charIdx2 = [1, 2, 3].find(i => i !== game.charIdx); fix = true; }
    if (fix) {
      saveAll();
      if (clw) [...clw.children].forEach((b, j) => b.setAttribute('aria-pressed', j === game.classIdx));
      [...document.querySelectorAll('#chars .char')].forEach((c, j) => c.setAttribute('aria-pressed', j === pickedIdx()));
    }
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
      b.style.order = ok ? 0 : 1;   // today's free tracks come first
      b.classList.toggle('dim', !ok);
    }
    // a course picked on an earlier day may be locked now: move to today's free cup
    if (game.mode !== 'battle' && !this.canStart()) {
      const i = CUPS[this.dayNo() % CUPS.length].courses[0];
      game.courseIdx = i; saveAll();
      for (const b of $('courses').children) b.setAttribute('aria-pressed', +b.dataset.ci === i);
      buildCourse(i); startDemo();
    }
    this.gate();
    this.cardBar();
  },
  cardBar() {
    let bar = document.getElementById('cardBar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'cardBar'; $('ctabs').before(bar); }
    let tb = document.getElementById('trophyBar');
    if (!tb) { tb = document.createElement('div'); tb.id = 'trophyBar'; bar.after(tb); }
    tb.innerHTML = this.trophyHtml(); tb.hidden = game.mode !== 'gp';
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
