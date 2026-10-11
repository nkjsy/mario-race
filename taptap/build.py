#!/usr/bin/env python3
"""Build the offline TapTap (Android) version of 星速卡丁车 from ../star-kart.html.

    python3 taptap/build.py

Output: taptap/www-root/www/ (packed into the APK by taptap/android). Every patch is an
exact text match; if main changed a patched line the build stops and names it.
"""
import os, re, shutil, sys

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'star-kart.html')
WWW = os.path.join(HERE, 'www-root', 'www')  # packed as assets/www in the APK
errors = []


def sub(s, old, new, label='patch', count=None):
    n = s.count(old)
    if n == 0 or (count is not None and n != count):
        errors.append(f'{label}: expected {count or ">=1"} match(es), found {n}: {old[:80]!r}')
        return s
    return s.replace(old, new)


html = open(SRC, encoding='utf-8').read()

# 1. Names and wording that point at other companies' games or trademarks
for old, new in [
    ('（和马里奥赛车的自动加速辅助一样）', ''),
    ('<h3>手柄（按马里奥赛车 8 的布局）</h3>', '<h3>手柄</h3>'),
    ('　·　支持手柄（按马里奥赛车布局）', '　·　支持手柄'),
    ('按 F1 规则积分', '按经典赛车规则积分'),
    ("name: '彩虹之路', en: 'RAINBOW ROAD'", "name: '星光大道', en: 'STARLIGHT ROAD'"),
    ('彩虹之路', '星光大道'),
    ("en: 'COIN RUNNERS'", "en: 'COIN RUSH'"),
    ("en: 'SHINE THIEF'", "en: 'GEM KEEPER'"),
    ('抢夺闪光', '宝石争夺'),
    ('闪光', '宝石'),
    ('// and the Mario Kart touches (jumps, glide ramps, tunnels, anti-gravity)', '// and the arcade touches (jumps, glide ramps, tunnels, anti-gravity)'),
    ('// Mario Kart boxes come back almost at once, so the back of the pack still gets items', '// boxes come back almost at once, so the back of the pack still gets items'),
    ('// Gamepads use the Mario Kart 8 layout (by button position, standard mapping):', '// Gamepads map by button position (standard mapping):'),
]:
    html = sub(html, old, new, 'names')

# 2. Everything offline: Three.js and fonts ship inside the APK
html = re.sub(r'<link rel="preconnect"[^>]*>\n', '', html)
html = sub(html, '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lilita+One&family=ZCOOL+KuaiLe&display=swap">',
           '<style>\n@font-face{font-family:"Lilita One";src:url(fonts/lilita-one.woff2) format("woff2");font-display:swap}\n'
           '@font-face{font-family:"ZCOOL KuaiLe";src:url(fonts/zcool-kuaile.woff2) format("woff2");font-display:swap}\n</style>', 'fonts', 1)
html = sub(html, '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', '<script src="three.min.js"></script>', 'three', 1)

# 3. Health advisory + age rating on the start screen (required for games in mainland China)
html = sub(html, '<div id="loading">正在搭建赛道…</div>',
           '<div id="loading"><div class="advice"><span class="age">8+</span><b>健康游戏忠告</b>'
           '<p>抵制不良游戏，拒绝盗版游戏。注意自我保护，谨防受骗上当。<br>适度游戏益脑，沉迷游戏伤身。合理安排时间，享受健康生活。</p>'
           '<small>正在搭建赛道…</small></div></div>', 'advice', 1)
html = sub(html, '[hidden]{display:none!important}',
           '[hidden]{display:none!important}\n'
           '#loading .advice{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:0 24px;max-width:640px}\n'
           '#loading .advice b{font-size:26px;color:var(--sun)}#loading .advice p{margin:0;font-size:17px;line-height:1.8}\n'
           '#loading .advice small{font-size:14px;color:var(--muted)}\n'
           '#loading .age{border:3px solid #43d17a;color:#43d17a;border-radius:10px;padding:2px 10px;font:22px "Lilita One",sans-serif}', 'advice-css', 1)
# keep the advisory up for at least 3 seconds
html = sub(html, "$('loading').hidden = true;\n  requestAnimationFrame(frame);",
           "setTimeout(() => { $('loading').hidden = true; }, Math.max(0, 3000 - performance.now()));\n  requestAnimationFrame(frame);", 'advice-time', 1)

# 4. Age rating and privacy policy in the help screen
html = sub(html, '<div class="btnRow"><button class="bigBtn" id="helpClose" type="button">知道了</button></div>',
           '<h3>适龄提示</h3>\n    <p>本游戏适合 8 岁以上用户。卡通风格竞速，含轻度卡通对抗（道具让对手打滑、转圈），无血腥暴力内容；单机离线，无内购、无广告、无社交和聊天功能。</p>\n'
           '    <h3>隐私政策</h3>\n    <p>本游戏是单机离线游戏，不需要联网，不收集、不上传任何个人信息，也不申请任何敏感权限。车手名字、金币、改装、赛季进度和计时赛纪录只保存在本机，卸载游戏即全部删除。</p>\n'
           '    <div class="btnRow"><button class="bigBtn" id="helpClose" type="button">知道了</button></div>', 'privacy', 1)

# 5. Checks
if re.search(r'mario|nintendo|马里奥|任天堂', html, re.I):
    for n, line in enumerate(html.split('\n'), 1):
        if re.search(r'mario|nintendo|马里奥|任天堂', line, re.I):
            errors.append(f'line {n}: mentions Mario/Nintendo: {line.strip()[:90]}')
for url in re.findall(r'https?://[^\s"\')]+', html):
    if 'github.com/bacinger' not in url:
        errors.append(f'external URL left: {url}')
if errors:
    print('\n'.join(errors))
    sys.exit(1)

shutil.rmtree(WWW, ignore_errors=True)
os.makedirs(os.path.join(WWW, 'fonts'))
open(os.path.join(WWW, 'index.html'), 'w', encoding='utf-8').write(html)
shutil.copy(os.path.join(HERE, 'assets', 'three.min.js'), WWW)
for f in os.listdir(os.path.join(HERE, 'assets', 'fonts')):
    shutil.copy(os.path.join(HERE, 'assets', 'fonts', f), os.path.join(WWW, 'fonts'))
total = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(WWW) for f in fs)
print(f'ok: www/ {total / 1e6:.2f} MB')
