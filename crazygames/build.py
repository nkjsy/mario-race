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
    ("$('loading').hidden = true;\n  requestAnimationFrame(frame);", "$('loading').hidden = true; CG.loaded();\n  requestAnimationFrame(frame);"),
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
    # comments that name another company's game
    ("// and the Mario Kart touches (jumps, glide ramps, tunnels, anti-gravity)", "// and the arcade touches (jumps, glide ramps, tunnels, anti-gravity)"),
    ("// Mario Kart boxes come back almost at once, so the back of the pack still gets items", "// boxes come back almost at once, so the back of the pack still gets items"),
    ("// Gamepads use the Mario Kart 8 layout (by button position, standard mapping):", "// Gamepads map by button position (standard mapping):"),
]
for old, new in HOOKS:
    html = sub(html, old, new, 'hook')

# 4. Split: page shell (index.html) + game.js, loaded after the SDK has initialised
i0 = html.index('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>')
j0 = html.index('<script>', i0)
j1 = html.index('</script>', j0)
game_js = html[j0 + len('<script>'):j1].strip('\n') + '\n'
shell = html[:i0] + open(os.path.join(HERE, 'loader.html'), encoding='utf-8').read() + html[j1 + len('</script>'):]
shell = sub(shell, '<title>Star Kart</title>\n', '<title>Star Kart</title>\n<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n', 'sdk')
shell = sub(shell, '<div id="loading">', '<div id="adBlock" hidden></div>\n<div id="loading">', 'adblock-div')
shell = sub(shell, '[hidden]{display:none!important}', '[hidden]{display:none!important}\n#adBlock{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.35)}\n'
           '#menu #startBtn{position:sticky;bottom:12px;z-index:5;box-shadow:0 6px 0 var(--ink),0 10px 30px rgba(0,0,0,.6)}', 'adblock-css')

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
