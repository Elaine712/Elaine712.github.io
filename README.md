# 张晓丹老师生日祝福网页

一套以手机端为核心、可直接部署的生日祝福页面。完整流程包括：欢迎入口、信封开启、祝福信、可选照片回忆、生日蛋糕许愿、Canvas 烟花庆典和最终祝福页。

## 修改祝福内容

所有会经常调整的内容都集中在项目根目录的 `config.js`：

- `recipient`：姓名或称呼
- `birthdayMonth` / `birthdayDay`：每年的生日月、日
- `sender`：落款
- `openingTitle` / `greetingTitle`：入口和祝福标题
- `message`：祝福正文，每个数组项是一行
- `finalWish` / `finalNote`：庆典与最终页文案
- `musicSrc` / `musicVolume`：音乐地址和音量
- `showPhotos` / `photos`：照片开关和照片列表

## 本地预览

需要 Node.js 22 或更高版本。首次运行时安装依赖，然后启动开发服务：

```bash
npm install
npm run dev
```

按终端显示的本地地址在浏览器中打开即可。

## 添加背景音乐

项目已内置一段原创轻音乐：

`public/assets/music/birthday.wav`

也可以替换为自己已获得授权的 MP3 或 WAV，并在 `config.js` 中修改 `musicSrc`。音乐只会在用户主动点击开启祝福后播放，以兼容手机浏览器。若音乐文件加载失败，页面会使用非常轻柔的本地合成音作为备用，不影响其他互动。

## 添加照片

1. 将 1–6 张照片放入 `public/assets/photos/`。
2. 在 `config.js` 中将 `showPhotos` 改为 `true`。
3. 按下面格式填写照片：

```js
photos: [
  { src: "./assets/photos/photo1.jpg", caption: "珍贵的美好时光" },
]
```

照片会保持完整比例展示；加载失败的照片会自动隐藏。如果关闭照片开关或没有可用照片，页面会自动跳过照片阶段。

## GitHub Pages 部署

项目已带有纯静态导出脚本和 GitHub Actions 发布流程，可直接发布到 GitHub Pages：

1. 在 GitHub 创建一个空仓库。
2. 在本地项目目录执行 `git init`，然后添加并提交全部文件。
3. 将仓库地址添加为远程地址并推送到 `main` 分支。
4. 打开仓库 `Settings → Pages`。
5. 在 `Build and deployment → Source` 中选择 `GitHub Actions`。
6. 打开仓库的 `Actions` 页面，等待 “Deploy birthday page to GitHub Pages” 完成。
7. 最终地址通常是 `https://用户名.github.io/仓库名/`，也会显示在 Pages 设置页面和发布任务中。

每次推送 `main` 分支时都会自动重新构建。也可以先在本地运行 `npm run export:static`，纯静态结果会生成在 `docs/`，可直接交给任何静态网站服务。

使用仓库子路径部署时，静态导出会自动使用相对资源路径；`config.js` 中的音乐和照片也应保持 `./assets/...` 相对路径。

## 手机与微信测试

- 重点测试 360–430px 宽度的竖屏手机。
- 用手机 Chrome、Safari、Edge 或微信内置浏览器打开正式 HTTPS 链接。
- 入口页点击按钮后检查音乐状态、信封切换、祝福文字、蛋糕熄灭、烟花和重播。
- 如果微信内音乐未播放，点击右上角“音乐关”手动开启。

## 常见问题

- **没有音乐**：确认文件名、路径和格式正确，并在用户点击后再测试。
- **照片不显示**：确认 `showPhotos: true`、文件路径大小写一致。
- **日期偏差**：倒计时按浏览设备本地时间生成，不使用 UTC 字符串。
- **动画卡顿**：页面会按设备能力限制粒子数；开启系统“减少动态效果”会进一步减少动画。
- **资源在部署后 404**：不要使用电脑绝对路径，统一使用 `./assets/...`。

## favicon 与分享标题

- favicon 文件：`public/favicon.svg`
- 页面标题与描述：`app/layout.tsx`
