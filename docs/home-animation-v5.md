# 首页中央互动动画 v5（历史）

> 已由 [v6 原地轻动画](home-animation-v6.md) 替代。下文仅记录旧实现，不代表当前运行行为。

2026-10-23。依据 `images/visual-v1/reference/首页视觉母版.png` 保留花园、Logo、石块棋盘和橙黄主按钮的视觉方向；这是分层重制，不是像素级 1:1 复制。

## 当前行为

- 7.2 秒展示循环：停留、0.3 秒预备发力、1.8 秒向右推箱、到位粒子、淡出复位。箱子在完全透明期间复位，不倒滑。
- 人物保留同一张脸部与躯干素材，腿部分关节运动；预备动作绕手掌旋转。人物与箱子共用移动向量，手掌不会随独立重绘帧抖动。当前是轻量刚体关节动画，不是完整骨骼蒙皮。
- 点击场景立即进入预备动作；动作期间重复点击不重置。拖出、取消、第二根手指不能误触。页面暂停会清除触摸状态。
- 棋盘固定，目标底格固定，独立光束/星芒与到位光环绘制在箱子后方。
- 底部按钮改用独立透明素材与 Canvas 文案，共享按压缩放、回弹与点击矩形；不再从整张母版贴图盖出按钮。设置与微信原生游戏圈触摸区域至少为 44 屏幕像素。

## 素材和接入

| 层 | 当前资源 / 消费 |
| --- | --- |
| 空棋盘 | `images/visual-v1/home/diorama-base-v5.png`，1433×1098，RGBA，内置 imagegen 编辑生成 |
| 人物 | `hero-push-frames-v3.png`，736×416；只取第 0 帧，将双腿和上身分别绘制 |
| 箱子 | `crate-v1.png`，可见裁切框 `[422,241,625,625]`，独立平移 |
| 按钮 | `button-start-v1.png`、`button-levels-v1.png`、`button-ranking-v1.png`；文字运行时绘制 |
| 加载器 | `src/ui/home-visual-v1.js`，本地 `visualHome` 分包 |
| 动画/交互 | `src/pages/home/scene-animation.js`、`src/pages/home/index.js` |

所有场景层使用母版坐标，经 `scenePlacement` 同一等比变换进入屏幕。新棋盘运行时映射至 `(45,435,860,660)`；人物起点 `(288,622)`，手掌 `(450,765)`；箱子绘制框 `(437,698,143,143)`；位移 `(137,18)`，目标中心约 `(638,827)`。按钮由布局直接定位。

`project.config.json` 排除八个不再使用的历史首页 PNG，但保留工作区原件。新资源已被加载器引用，并处于现有本地分包目录；未上传云端。

## 生成记录

使用内置 imagegen，输入为 `diorama-base-v3.png`，先查看原图再编辑；生成结果直接复制为工作区 v5，未替换旧资产。

完整提示词：

> Use case: precise-object-edit. Production game asset edit target: the attached transparent isometric garden board. Remove ONLY the wooden crate from the center, replacing its occluded floor with matching square grass/tan stone tiles continuing the same grid. Keep all other geometry, perimeter rocks, foliage, flowers, static yellow star goal tile at right, camera angle, lighting and exact composition unchanged. No character, no crate, no added objects, no UI/text. Maintain genuine transparent alpha outside the entire diorama silhouette, not a checkerboard. Match original 860:660 image proportions. This is a static empty board layer for an independently animated character and crate.

生成存在轻微纹理和构图差异；已查看透明底图及运行时叠层，没有宣称保持母版原像素。

## 验证与后续验收

- [x] 首页自动测试：动作前进/透明复位、稳定人物、连点不重启、拖出取消、多指隔离、资源路径/alpha/分包引用、安全区与视口。
- [x] `npm run check` 与 `git diff --check`。
- [x] 最终 `npm test`：92 项全部通过。
- [x] 浏览器实际 Canvas：414×896 与 320×568；查看初始、推动、到位、消失、重新出现五个相位。
- [x] Playwright 实际鼠标点击两种尺寸的开始、选关、排行榜、设置；拖出不触发，点击场景启动动画。预览记录动作，不导航到正式游戏。
- [ ] 微信开发者工具编译与分包体积检查、原生游戏圈点击。
- [ ] 体验版与真机：连续播放流畅度、触摸延迟、低端机、系统隐藏/恢复、云资源失败回退。

预览：`tools/home-visual-preview.html`（在仓库根目录运行本地 HTTP 服务后打开）。图像证据：`output/playwright/home-v5-final.png`；不同相位和按压截图也位于 `output/playwright/`。
