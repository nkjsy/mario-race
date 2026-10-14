# Star Kart · CrazyGames 版

这个文件夹是给 [CrazyGames](https://www.crazygames.com/) 上架用的单独版本，只在 `crazygames` 分支上。`main` 分支和 GitHub Pages 上的中文版不受影响。

## 和主版本的区别

| | 主版本（main） | CrazyGames 版 |
| --- | --- | --- |
| 语言 | 中文 | 英文（平台硬性要求） |
| Three.js、字体 | 从 CDN / Google Fonts 加载 | 打包在本地（平台要求用相对路径） |
| CrazyGames SDK | 无 | 加载开始/结束、游戏开始/暂停、比赛之间的插页广告、广告播放时静音、跟随平台静音设置、进度存到玩家的 CrazyGames 账号 |
| 名字 | 彩虹之路、抢夺闪光、抢金币 | Starlight Road、Gem Keeper、Coin Rush（避开任天堂的叫法） |
| 开始比赛按钮 | 在菜单最下面 | 固定在屏幕底部（平台要求一键进游戏） |

没有广告拦截器、或者不在 CrazyGames 网站上打开时，SDK 部分自动跳过，游戏照常能玩，存档退回浏览器本地。

## 文件

- `build.py`：从 `../star-kart.html` 生成 CrazyGames 版。所有改动都是精确文本替换，主版本改了对应的行，构建会报错并指出是哪一行，不会悄悄漏翻。
- `en.py`：英文文案对照表。
- `cg.js`：CrazyGames SDK 适配层。
- `loader.html`：先初始化 SDK（预载存档），再加载游戏。
- `assets/`：Three.js r128 和两个字体（Lilita One、Fredoka，都是 SIL Open Font License）。
- 部件价格比主版本贵（最贵的黄金翼 2000 金币），一局比赛大约拿 10～40 金币，解锁全部要玩很多天。
- 只有 8 个车手（每种性能风格一个），每场 8 辆车；没有赛季模式。
- 赛道每天免费开放一个卡丁车杯赛（3 条）加 5 条经典赛道，其余用「Star Pass」（门票）开放 24 小时。开局送 1 张，之后 120 金币买一张。买门票用的是「可花金币」，部件解锁仍按累计赚到的金币算。
- `daily.js`：只在 CrazyGames 版里的每日签到（连续天数越多奖励越高：5/8/10/12/15/20/30 金币，断签从第 1 天重来）、每日小任务（奖励 25 金币）、结算页的解锁进度和「下一条赛道」按钮。
- `dist/`：生成好的上传文件夹。
- `star-kart-crazygames.zip`：直接上传的 zip。
- `store/`：封面图和预览视频。

## 主版本更新后怎么同步

```bash
git checkout crazygames
git merge main
python3 crazygames/build.py      # 报错就按提示改 en.py
git add -A && git commit -m "Rebuild CrazyGames version" && git push
```

## 上架步骤

1. 打开 <https://developer.crazygames.com/>，用邮箱或 Google 账号注册开发者账号。
2. 点 **Submit game**（提交游戏），引擎选 **HTML5**。
3. 上传 `star-kart-crazygames.zip`（或者 `dist/` 里的全部文件）。入口文件是 `index.html`。
4. 平台会给一个 **Preview** 预览链接。打开后按 F12 看控制台，确认能进比赛、比完点 Race again 时可能会出现测试广告，没有报错。
5. 填写资料（下面有可直接复制的英文文案）：
   - Name：Star Kart（如果平台提示重名，可以改成 Star Kart Racing 之类）
   - Category：Driving / Racing
   - Tags：kart, racing, 3d, 2 player, drift
   - Orientation：Landscape（手机也支持，横屏）
   - 勾选 **Progress Save / Data module**（游戏用它存金币、改装和赛季进度）
6. 上传 `store/` 里的封面：横版 1920×1080、竖版 800×1200、方形 800×800；预览视频横版和竖版各一个。
7. 提交。新游戏先走 **Basic Launch**（基础上线，平台不放广告，先看玩家数据），平台根据数据决定是否升级到 **Full Launch**，那时才开启广告分成。SDK 已经接好，升级时不用再改代码。
8. 收款：在开发者后台填写收款信息，具体方式和起付线以后台说明为准。

### 英文简介（Description）

> Star Kart is a colorful 3D kart racer with 8 original drivers, 9 themed kart courses and 40 classic circuits based on real-world track layouts. Hop and drift through corners to charge blue, orange and purple mini-turbos, fly off glide ramps, flip into anti-gravity, and use banana peels, homing shells, rockets and the Super Star to fight for first place.
>
> Play a single race, a 3-race Grand Prix, Time Trial against your own ghost, or four Battle games in the Neon Arena: Balloon Battle, Coin Rush, Gem Keeper and Bomb Blast. Two players can race split screen on one keyboard. Earn coins to unlock new bodies, tires and gliders in the Garage. CPU drivers follow exactly the same rules as you, with no hidden catch-up speed.

### 英文操作说明（Controls）

> **Keyboard**
> Arrow keys or WASD: gas, brake, steer (auto-accelerate is on by default)
> Space or Shift: hop and drift, release for a boost
> E or X: use item (hold to trail it as a shield, hold Down to throw backward)
> C: look back · P: pause · M: mute
>
> **2 players (split screen)**
> 1P: WASD, Left Shift or F to drift, E or Q for items, R to look back
> 2P: Arrow keys, Right Shift or Numpad 0 to drift, Enter or Numpad . for items, Right Ctrl or Numpad 1 to look back
>
> **Gamepad**
> Right button: gas · Bottom button: brake · Stick: steer · RB/RT: drift · LB/LT: item · Top button: look back · Start: pause
>
> **Mobile**
> Gas is automatic. Use the arrows to steer and the DRIFT, BRAKE and ITEM buttons on screen.
