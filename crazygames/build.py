#!/usr/bin/env python3
"""Build the CrazyGames version of Star Kart from ../star-kart.html.

    python3 crazygames/build.py

Output: crazygames/dist/ (upload-ready folder) and crazygames/star-kart-crazygames.zip.
Every patch is an exact text match; if main changed a patched line the build stops
and names it, so nothing is silently left untranslated or unhooked.
"""
import os, re, shutil, sys, zipfile
sys.dont_write_bytecode = True

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from en import TR, NAME_OVERRIDES  # noqa: E402

SRC = os.path.join(HERE, '..', 'star-kart.html')
DIST = os.path.join(HERE, 'dist')
ZIP = os.path.join(HERE, 'star-kart-crazygames.zip')
CJK = re.compile(r'[　-〿一-鿿＀-￯]')
errors = []


def sub(s, old, new, label='patch'):
    if old not in s:
        errors.append(f'{label}: not found: {old[:90]!r}')
        return s
    return s.replace(old, new)


html = open(SRC, encoding='utf-8').read()

# 1. English text
for old, new in TR:
    html = sub(html, old, new, 'en')


def name_en(m):
    zh, en = m.group(1), m.group(2)
    if not CJK.search(zh):
        return m.group(0)
    nm = NAME_OVERRIDES.get(en) or ' '.join(w if w.isdigit() else w[:1] + w[1:].lower() for w in en.split(' '))
    return f"name: '{nm}', en: '{en}'"


html = re.sub(r"name: '([^']*)', en: '([^']*)'", name_en, html)
html = html.replace('\u3000', '\u2002')  # ideographic spaces used as separators -> en space

# 2. Fonts: bundle Lilita One + Fredoka locally instead of Google Fonts
html = re.sub(r'<link rel="preconnect"[^>]*>\n', '', html)
html = sub(html, '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lilita+One&family=ZCOOL+KuaiLe&display=swap">',
           '<style>\n@font-face{font-family:"Lilita One";src:url(fonts/lilita-one.woff2) format("woff2");font-display:swap}\n'
           '@font-face{font-family:"Fredoka";src:url(fonts/fredoka.woff2) format("woff2");font-weight:300 700;font-display:swap}\n</style>', 'fonts')
html = sub(html, '--display:"Lilita One","ZCOOL KuaiLe","PingFang SC","Microsoft YaHei",system-ui,sans-serif;', '--display:"Lilita One",system-ui,sans-serif;', 'fonts')
html = sub(html, '--cn:"ZCOOL KuaiLe","Lilita One","PingFang SC","Microsoft YaHei",system-ui,sans-serif;', '--cn:"Fredoka","Lilita One",system-ui,sans-serif;', 'fonts')
html = sub(html, '.logo b{font-family:var(--cn);', '.logo b{font-family:var(--display);', 'fonts')  # Latin logo reads better in Lilita One
html = html.replace('"ZCOOL KuaiLe","Lilita One"', '"Lilita One"').replace('document.fonts.load(\'40px "ZCOOL KuaiLe"\')', 'document.fonts.load(\'600 40px "Fredoka"\')')

# 3. Hooks into the game code
HOOKS = [
    # gameplay start/stop follows the game state every frame
    ("function frame(now) {\n  requestAnimationFrame(frame);", "function frame(now) {\n  requestAnimationFrame(frame); CG.tick();"),
    ("$('loading').hidden = true;\n  requestAnimationFrame(frame);", "$('loading').hidden = true; CG.loaded(); RET.init();\n  requestAnimationFrame(frame);"),
    # daily challenge, unlock progress and the next-course button on the results screen (daily.js)
    ("  $('results').hidden = false; $('touch').hidden = true;\n}", "  RET.results();\n  $('results').hidden = false; $('touch').hidden = true;\n}"),
    ("game.coinsPaid = false; saveAll();", "game.coinsPaid = false; game.retCounted = false; saveAll();"),
    # mute: player toggle, ads and the platform setting are combined in CG.applyMute
    ("function toggleMute() { Snd.setMuted(!Snd.muted); $('muteBtn').textContent = Snd.muted ? '×' : '♪'; }",
     "function toggleMute() { CG.userMute = !CG.userMute; CG.applyMute(); }"),
    # midgame ad at the natural break between races
    ("$('againBtn').onclick = () => {\n  if (game.gp) {", "$('againBtn').onclick = () => CG.midgame(() => {\n  if (game.gp) {"),
    ("  startRace();\n};\n$('menuBtn').onclick", "  startRace();\n});\n$('menuBtn').onclick"),
    # privacy note in the help screen (CrazyGames launch requirement)
    ('    <div class="btnRow"><button class="bigBtn" id="helpClose" type="button">Got it</button></div>',
     '    <h3>Privacy</h3>\n    <p>Star Kart does not collect any personal data and has no accounts, chat or external links. '
     'Your progress is saved through CrazyGames, whose Privacy Policy and Terms &amp; Conditions apply while you play here.</p>\n'
     '    <div class="btnRow"><button class="bigBtn" id="helpClose" type="button">Got it</button></div>'),
    # one driver per stat style (8), so races have 8 karts; no season mode
    ("];\nconst COURSES = [", "];\nCHARS.length = 8;\nconst COURSES = ["),
    ("];\nfunction clearKarts()", "];\nMODES.splice(MODES.findIndex(m => m.id === 'season'), 1);\nfunction clearKarts()"),
    ("race 2 laps against 11 CPU drivers.", "race 2 laps against 7 CPU drivers."),
    ("two players plus 10 CPU drivers.", "two players plus 6 CPU drivers."),
    # daily free tracks and unlock cards (daily.js)
    ("  refreshChars(); showStats();\n}\nfunction buildMenu", "  refreshChars(); showStats(); RET.locks();\n}\nfunction buildMenu"),
    ("$('startBtn').onclick = () => { game.gp = null; startRace(); };", "$('startBtn').onclick = () => { game.gp = null; if (!RET.canStart()) return; startRace(); };"),
    ("$('wallet').textContent = 'Coins ' + save.coins + ' 🪙';", "$('wallet').textContent = 'Earned ' + save.coins + ' 🪙 · to spend ' + RET.wallet() + ' 🪙';"),
    # playtest fixes: first race is one lap, default races are 2 laps, battle spectating (fixes.js)
    ("game.demo = false; LAPS = rules().laps;", "game.demo = false; LAPS = RET.lapsFor(rules().laps);"),
    ("const DEF_RULES = { items: 'normal', cpu: 'normal', laps: 3, teams: false };", "const DEF_RULES = { items: 'normal', cpu: 'normal', laps: 2, teams: false };"),
    # comments that name another company's game
    ("// and the Mario Kart touches (jumps, glide ramps, tunnels, anti-gravity)", "// and the arcade touches (jumps, glide ramps, tunnels, anti-gravity)"),
    ("// Mario Kart boxes come back almost at once, so the back of the pack still gets items", "// boxes come back almost at once, so the back of the pack still gets items"),
    ("// Gamepads use the Mario Kart 8 layout (by button position, standard mapping):", "// Gamepads map by button position (standard mapping):"),
]
for old, new in HOOKS:
    html = sub(html, old, new, 'hook')

# Slower unlocks: a race pays about 10-40 coins, so the full garage now takes
# around 80-100 races plus daily rewards instead of about 25 races
PRICES = {40: 60, 90: 200, 160: 450, 250: 800, 30: 40, 70: 150, 130: 350, 400: 1500, 60: 100, 120: 300, 500: 2000}
found = set(int(m) for m in re.findall(r'need: (\d+), d:', html))
if not set(PRICES) <= found:
    errors.append(f'prices: missing {sorted(set(PRICES) - found)}')
html = re.sub(r'need: (\d+), d:', lambda m: f'need: {PRICES.get(int(m.group(1)), int(m.group(1)))}, d:', html)

# 4. Split: page shell (index.html) + game.js, loaded after the SDK has initialised
i0 = html.index('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>')
j0 = html.index('<script>', i0)
j1 = html.index('</script>', j0)
game_js = html[j0 + len('<script>'):j1].strip('\n') + '\n' + ''.join(open(os.path.join(HERE, f), encoding='utf-8').read() + '\n' for f in ('daily.js', 'fixes.js'))
shell = html[:i0] + open(os.path.join(HERE, 'loader.html'), encoding='utf-8').read() + html[j1 + len('</script>'):]
shell = sub(shell, '<title>Star Kart</title>\n', '<title>Star Kart</title>\n<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n', 'sdk')
shell = sub(shell, '<div id="loading">', '<div id="adBlock" hidden></div>\n<div id="loading">', 'adblock-div')
shell = sub(shell, '[hidden]{display:none!important}', '[hidden]{display:none!important}\n#adBlock{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.35)}\n'
           '#menu #startBtn{position:sticky;bottom:12px;z-index:5;box-shadow:0 6px 0 var(--ink),0 10px 30px rgba(0,0,0,.6)}', 'adblock-css')

shell = sub(shell, '#results .panel{max-width:720px}', '#results .panel{max-width:720px}\n'
           '#retBox{display:flex;flex-direction:column;gap:8px;font-size:16px}#help p{margin:2px 0}#results.podium #retBox{display:none}\n'
           '.retRow{background:rgba(255,255,255,.07);border-radius:12px;padding:8px 12px}.retDone{background:rgba(67,209,122,.25)}\n'
           '.retBar{height:10px;border-radius:5px;background:rgba(255,255,255,.15);margin-top:6px;overflow:hidden}.retBar i{display:block;height:100%;background:linear-gradient(90deg,#ffd23f,#ff9f1c)}\n'
           '#retMenu{margin:-4px 0 0;text-align:center;font-size:16px;color:#ffd23f}\n'
           '#cardBar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px;background:rgba(255,210,63,.12);border-radius:14px;padding:8px 12px;font-size:15px}#cardBar .opt{flex:0 0 auto;padding:5px 12px;font-size:15px}\n'
           '.tag{display:inline-block;font:12px var(--display);letter-spacing:.05em;border-radius:6px;padding:0 5px;margin-right:4px;background:#43d17a;color:#0b1a10}.tag.lock{background:rgba(255,255,255,.2);color:#fff}\n'
           '#daily{z-index:50}#daily .panel{max-width:640px;text-align:center;gap:12px}\n'
           '.dStrip{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}.dCell{background:rgba(255,255,255,.08);border-radius:12px;padding:6px 2px;display:flex;flex-direction:column;gap:2px}\n'
           '.dCell small{font-size:11px;opacity:.75}.dCell b{font:22px var(--display)}.dCell.past{opacity:.5}.dCell.now{background:#ffd23f;color:var(--ink);transform:scale(1.08)}\n'
           '.dGot{font:30px var(--display);color:#ffd23f;margin:0}.dCh,.dTip{margin:0;font-size:16px}.dTip{opacity:.75}\n'
           '@media (max-height:500px){#results .btnRow .bigBtn,#daily .bigBtn{font-size:18px;padding:6px 16px}#daily .panel{gap:6px;padding-top:12px}#daily .resTitle{font-size:30px}.dGot{font-size:22px}}', 'daily-css')

shell = sub(shell, '#daily{z-index:50}#daily .panel{max-width:640px;text-align:center;gap:12px}\n', '#daily{z-index:50}#daily .panel{max-width:640px;text-align:center;gap:12px}\n'
           '#retBox{flex-direction:row;flex-wrap:wrap;gap:6px;font-size:13px}.retRow{padding:5px 10px;flex:1 1 auto}.retWide{flex-basis:100%}\n'
           '#retMenu small{display:block;font-size:13px;color:#cfd3ff;opacity:.9}\n'
           '.opt.dim{opacity:.55}#trophyBar{margin:-4px 0 10px;font-size:15px;background:rgba(255,255,255,.07);border-radius:14px;padding:6px 12px}#trophyBar .tCup{display:inline-block;margin:0 12px 0 6px;white-space:nowrap}#trophyBar i{font-style:normal;margin:0 3px}\n'
           '.char{position:relative}.char:disabled{opacity:.5;filter:grayscale(.75);cursor:not-allowed}.lockTag{display:block;font:13px var(--display);color:#ffd23f;margin-top:2px}.char:disabled .en{display:none}\n'
           '@media (max-height:520px){#retBox .retRow:not(.retWide){display:none}}\n'
           '', 'results-css')

# Short help: only the controls a new player needs
i_help = shell.index('<h3>Keyboard (1 player)</h3>')
j_help = shell.index('<h3>Privacy</h3>')
shell = shell[:i_help] + '''<h3>Keyboard</h3>
    <table>
      <tr><td><kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd></td><td>Steer (gas is automatic)</td></tr>
      <tr><td><kbd>↓</kbd> or <kbd>S</kbd></td><td>Brake / reverse</td></tr>
      <tr><td><kbd>Space</kbd> or <kbd>Shift</kbd></td><td>Hold in a turn to drift, release for a boost</td></tr>
      <tr><td><kbd>E</kbd> or <kbd>X</kbd></td><td>Use item</td></tr>
      <tr><td><kbd>P</kbd> / <kbd>M</kbd></td><td>Pause / mute</td></tr>
    </table>
    <h3>Phone and tablet</h3>
    <p>Gas is automatic. Steer with ◀ ▶, hold DRIFT in turns, tap ITEM to use your item.</p>
    <h3>Gamepad</h3>
    <p>Stick to steer, right button for gas, RB to drift, LB for items.</p>
    <h3>2 players</h3>
    <p>1P: WASD, Left Shift to drift, E for items. 2P: arrow keys, Right Shift to drift, Enter for items.</p>
    ''' + shell[j_help:]

# Progress goes to the SDK data module; ghosts and leaderboards stay in localStorage
# (they can exceed the 1 MB account save limit).
out = []
for line in game_js.split('\n'):
    if 'localStorage.' in line and 'ghostKey()' not in line and 'boardKey()' not in line:
        line = line.replace('localStorage.', 'CGStore.')
    out.append(line)
game_js = '\n'.join(out)

# 5. Checks
for name, text in (('index.html', shell), ('game.js', game_js)):
    for n, line in enumerate(text.split('\n'), 1):
        if CJK.search(line):
            errors.append(f'{name}:{n}: Chinese text left: {line.strip()[:100]}')
    if re.search(r'mario|nintendo', text, re.I):
        errors.append(f'{name}: mentions Mario/Nintendo')
    for url in re.findall(r'https?://[^\s"\')]+', text):
        if 'sdk.crazygames.com' not in url and 'github.com/bacinger' not in url:
            errors.append(f'{name}: external URL {url}')
if errors:
    print('\n'.join(errors))
    sys.exit(1)

# 6. Write dist + zip
shutil.rmtree(DIST, ignore_errors=True)
os.makedirs(os.path.join(DIST, 'fonts'))
open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8').write(shell)
open(os.path.join(DIST, 'game.js'), 'w', encoding='utf-8').write(game_js)
shutil.copy(os.path.join(HERE, 'cg.js'), DIST)
shutil.copy(os.path.join(HERE, 'assets', 'three.min.js'), DIST)
for f in os.listdir(os.path.join(HERE, 'assets', 'fonts')):
    shutil.copy(os.path.join(HERE, 'assets', 'fonts', f), os.path.join(DIST, 'fonts'))
with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(DIST):
        for f in sorted(files):
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p, DIST))
total = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(DIST) for f in fs)
print(f'ok: dist/ {total / 1e6:.2f} MB, zip {os.path.getsize(ZIP) / 1e6:.2f} MB')
