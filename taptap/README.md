# 星速卡丁车 · TapTap 版（无版号）

这个文件夹是上 TapTap 用的单独版本，只在 `taptap` 分支上。`main`、GitHub Pages 和 CrazyGames 版都不受影响。

## 无版号能做什么

根据 [TapTap 开发者快速入门指南](https://developer.taptap.cn/docs/en/store/standardies-operation/) 和 [游戏审核规范细则](https://developer.taptap.cn/docs/en/store/release/publish/agree/)：

- 没有版号只能以 **「开放试玩」** 上线，不能「正式上线」。
- **不能收费、不能内购**，否则属于非法经营，可能下架、罚款。广告也算商业化，这个版本一律不放。
- 开放下载或测试包体需要：**软件著作权登记证书（原始取得）**、**未成年人防沉迷**、**隐私合规**。单机不联网的游戏不需要 ICP 备案。
- 只开预约、展示页面不需要任何资质，可以先建页面攒预约。

## 和主版本的区别

| | 主版本（main） | TapTap 版 |
| --- | --- | --- |
| 形式 | 网页 | 安卓 APK（WebView 外壳，完全离线） |
| Three.js、字体 | 从 CDN / Google Fonts 加载 | 打包在 APK 里 |
| 启动画面 | 直接进菜单 | 健康游戏忠告 + 8+ 适龄提示，至少 3 秒 |
| 操作说明 | — | 增加「适龄提示」「隐私政策」两节 |
| 名字 | 彩虹之路、抢夺闪光、按 F1 规则积分 | 星光大道、宝石争夺、按经典赛车规则积分；去掉所有「马里奥赛车」字样 |
| 权限 | — | 不申请任何权限 |
| 返回键 | — | 比赛中按返回键暂停；菜单里连按两次退出；切后台自动暂停 |

防沉迷：用 TapTap 的 **TapPlay**（在 TapTap 客户端的沙箱里运行游戏）时，TapTap 自带实名和防沉迷，游戏不用改代码，上传 APK 时勾选 TapPlay 模式授权即可（[TapPlay 功能介绍](https://developer.taptap.cn/docs/en/sdk/tap-play/features/)）。

## 文件

- `build.py`：从 `../star-kart.html` 生成离线版到 `www-root/www/`。所有改动都是精确文本替换，主版本改了对应的行会报错。
- `android/`：安卓工程（包名 `com.nkjsy.starkart`，minSdk 24，targetSdk 34）。
- `store/icon-512.png`：商店图标。
- `../.github/workflows/taptap-apk.yml`：每次推送到 `taptap` 分支自动打包，生成**未签名**的 APK，发布在 Releases 的 `taptap-build`。

## 签名

签名证书不放在仓库里，在项目文件夹 `mario-race/taptap/keystore/`（`starkart-release.p12` 和密码文件）。**一定要备份**：以后更新游戏必须用同一个证书签名，丢了就只能换包名重新上架。

签名命令（需要 Java 和 [uber-apk-signer](https://github.com/patrickfav/uber-apk-signer/releases)）：

```bash
java -jar uber-apk-signer-1.3.0.jar -a star-kart-taptap-unsigned.apk \
  --ks starkart-release.p12 --ksAlias starkart --ksPass <密码> --ksKeyPass <密码> -o out
```

## 主版本更新后怎么同步

```bash
git checkout taptap
git merge main
python3 taptap/build.py   # 报错就按提示改 build.py
# 改 taptap/android/app/build.gradle 里的 versionCode（+1）和 versionName
git commit -am "Update TapTap build" && git push   # Actions 自动打包
```

## 上架步骤

### 第一步：申请软件著作权（个人可以办，免费）

1. 到 [中国版权保护中心](https://register.ccopyright.com.cn/) 注册账号并实名认证（个人用身份证）。
2. 选「计算机软件著作权登记申请」，填写：
   - 软件全称：星速卡丁车游戏软件；简称：星速卡丁车；版本号：V1.0
   - 权利取得方式：原始取得；权利范围：全部权利
   - 开发方式：独立开发；著作权人：你本人
   - 开发完成日期、首次发表日期：按实际填写（游戏 2026 年 9 月在 GitHub Pages 首次公开）
   - 开发的硬件环境：PC；运行的硬件环境：安卓手机，四核以上处理器，3GB 以上内存
   - 开发的操作系统：Windows / Linux；运行平台：Android 7.0 及以上
   - 编程语言：JavaScript、HTML5、CSS、Java；源程序量：约 4400 行
   - 主要功能和技术特点：可参考用户操作手册第 1 章
3. 上传项目文件夹 `mario-race/taptap/软著/` 里的两个 PDF：
   - 源程序：前 30 页 + 后 30 页，每页 50 行，页眉带软件名称、版本号和页码；
   - 用户操作手册：共 17 页，带截图。
4. 提交后等审核，官方免费办理一般要 1～2 个月；有补正通知就按要求改材料。拿到登记证书后再进行下一步。

### 第二步：TapTap 开发者账号

1. 到 [TapTap 开发者中心](https://developer.taptap.cn/) 注册，完成开发者认证（个人开发者用身份证）。
2. 新建游戏，名称「星速卡丁车」，上传 `store/icon-512.png` 图标、截图、宣传视频（可以用 `crazygames/store/` 里的视频，或者录手机画面）、简介。
3. 此时可以先开**预约**，不需要资质。

### 第三步：开放试玩

1. 资质里上传软著登记证书扫描件；没有版号就不填版号。
2. 填写隐私政策（游戏内「操作说明」最后一节可以直接用；TapTap 如果要求填链接，需要单独放一个网页）。
3. 上传签名好的 APK，勾选 **TapPlay 模式授权**，上线方式选 **开放试玩**。
4. 审核一般 5～7 天。

### 以后想赚钱

- 必须先拿到版号。个人拿不到，要以公司名义、找出版单位申报。
- 或者在海外上架：TapTap 国际版、Google Play，或者 CrazyGames（`crazygames` 分支已经适配好）。

## 简介文案（可直接复制）

> 星速卡丁车是一款卡通风格的 3D 卡丁车竞速游戏。20 名原创车手，9 条主题赛道加 40 条按真实赛车场走向打造的经典赛道。转弯时跳跃漂移蓄力加速，飞上滑翔跳台，冲过反重力路段，用香蕉皮、追踪弹、无敌星和对手斗智斗勇。单场比赛、三站大奖赛、24 站完整赛季、计时赛挑战自己的幽灵车，还有气球大战等四种对战玩法。比赛赢来的金币可以解锁新车身、轮胎和滑翔翼。单机离线，无内购、无广告。
