# 首页人物与格线校准 v7

## 顶部与右侧可见轮廓修正

用户截图指出顶部、右侧仍不对齐。先前只检查几何箱底，未覆盖贴图透明倒角导致的可见边界偏差。本次将三个面的取样角点内移到实色木框，共享面角点采用完全一致的源坐标；各面加不透明底色，并从实际 top/floor 顶点绘制连续外框。测试新增实际描边路径断言。27 项测试、语法检查通过，浏览器截图为 `output/playwright/home-crate-visible-edges.png`。仍需用户确认截图指出的视觉问题是否已消除，真机尚未验证。

## 2026-10-23 四边严格平行修正（当前）

替换先前 u/v 不同比例的双线性内缩：直接将实测格子的四条边各向内平移 10 母版像素，以相邻偏移线交点构造箱底。非平行四边形的每条边方向均独立保留，顶面为箱底垂直上移 88 像素，四条顶边也与对应格边平行。保留原木纹、人物位置、尺寸与动画。四边角度测试从约 1 度容差收紧至叉积归一值小于 1e-12，并检查每边垂直间距均为 10。27 项首页测试及语法检查通过；浏览器格线截图 `output/playwright/home-crate-parallel-grid.png`，干净截图 `output/playwright/home-crate-parallel.png`。微信真机未验证。

2026-10-23。用户指出箱子没有对齐格子，人物像被拉瘦且不够可爱，并提供圆脸短身探险家参考。本版替代 v6 人物切片旋转与底图内固定箱子，保留目标发光、汗滴、蝴蝶、浮光和按钮轻动画。

## 箱子

使用空棋盘 `diorama-base-v5.png`。目标左侧格子的母版坐标四角为 `(459,759)、(588,785)、(569,867)、(432,840)`。以四角平均中心向内收至 82% 得到箱子底面，所以四边与格线分别平行且底面全部落在单格内。箱高 88 母版像素（细节修正后，正面木纹不再压得偏扁）。

`drawHomeCrate` 把既有 `crate-v1.png` 的顶面、侧面、正面木纹分别映射到上述立体几何上，每个面用两个三角形贴图。箱子独立静止，不再用一个估计宽高的精灵矩形决定摆放。

预览的“格线核对”：青色为格子边界，粉色为箱子底面。证据见 `output/playwright/home-v7-grid.png`。

## 人物

用户参考存档：`output/imagegen/home-scene-v7/reference-character.png`。

内置 imagegen 生成并清理透明背景的资源：`images/visual-v1/home/hero-effort-v7.png`，1536×1024 RGBA，4 列 2 行。当前选用上排四个较一致的姿势：准备、支撑、屈膝、闭眼憋劲，再反向恢复；下排没有进入运行序列。

每个源单元 384×512，所有姿势固定等比缩放 0.42；通过源手掌锚点 `[344,310]、[371,311]、[359,314]、[356,316]` 对齐到场景 `(456,739)`。完整绘制每个姿势，不切腰、不挤压、不做整图交叉淡化。表现力来自重绘姿势和表情，原地循环 2.4 秒。没有移动到下一格或淡出复位；脚部在姿势间有小幅变化，不能宣称逐像素固定。

加载器、分包排除项同步更新：启用空棋盘、独立箱子、新人物图集；排除旧 v3 人物和含箱棋盘，原文件保留历史用途。

## 生成提示词

第一次使用用户参考图，内置 imagegen：

> Use case: stylized-concept. Production animation sprite atlas, genuine transparent background. Use the attached character as exact identity/style reference: very cute chubby young explorer, very large round face/head, tiny plump torso, stubby thick legs, big rounded brown boots, yellow miner helmet blue round lamp, yellow shirt, blue overalls, white gloves, small brown backpack. Do NOT make him slender or adult. Create ONE seamless in-place exertion animation sprite sheet with 8 sequential poses, exactly 4 equally sized columns and 2 equally sized rows. No grid lines or labels. Each cell same camera (three-quarter facing right and slightly down, seen from above), same character identity, same size, same location, generous transparent padding. Character is pushing against an invisible heavy box on the RIGHT with BOTH white palms held at the EXACT SAME contact point at right edge of character. Both boots stay at exact ground anchors throughout; knees flex visibly, shoulders lower and drive forward, round cheeks puff with cute effort, back compresses naturally WITHOUT scaling the body or shrinking its width. Cycle sequence: 1 ready bent knees; 2 brace; 3 deeper brace; 4 strong push; 5 peak push; 6 ease; 7 recover; 8 approaching pose1. Small coherent changes frame-to-frame with clearly perceptible effort, same head size and face throughout. Keep face visible, soft adorable expression. No crate, no floor, no shadow, no arrows, no text, no scenery, no sweat (added in runtime). Actual transparent alpha around every character.

第二次使用生成图做透明背景清理，内置 imagegen：

> Background extraction only. Remove ALL brown/gold backdrop and all background glows from this 4-column by 2-row character animation atlas. Output a genuine RGBA transparent PNG, alpha=0 outside each character. Keep all 8 characters, their pixels, positions, expressions, scales and canvas dimensions EXACTLY unchanged. No checkerboard, no colored background, no new shadows. Preserve clean antialiased silhouettes and finger gaps. This must be a transparent game sprite sheet.

已读取实际 alpha：左上角为 0，角色内采样为 252；不是把工具展示的背景色当作透明结果。生成姿势未完全满足提示中的脚底锚点要求，因此仅选上排四姿势，采用同一缩放和手掌校准，不通过非等比拉伸补偿。

## 验证

- [x] 单格内底面、四边平行、贴图变换的顶点精度测试。
- [x] 每个姿势统一等比缩放、手掌接触点相同、不进行运行时身体切片的测试。
- [x] 首页 26 项专项测试通过；原有按钮交互、安全区及资源检查保留。
- [x] 最终全量 `npm test` 92 项通过，`npm run check` 与 `git diff --check` 通过。
- [x] 浏览器查看四姿势、格线叠加；实际 Canvas 录制 `output/playwright/home-v7-motion.webm`，约 5.2 秒。
- [ ] 用户确认角色可爱程度与动作观感。
- [ ] 微信开发者工具、体验版与真机验收。

预览入口为 `tools/home-visual-preview.html`；最终截图为 `output/playwright/home-v7-final.png`。单元测试只证明几何和程序约束，动作观感以录像和实际体验为准。


## 细节修正：箱体比例、汗滴与人物不踩线

保留当前完整姿势动画，不执行先前讨论的滚动背景重做。

- 箱体保持同一底面，箱高从 74 调为 88，使正面宽高比例更接近木纹素材原始比例。
- 人物整体统一等比缩放由 0.46 调为 0.42，手掌上移 14 母版像素，保持圆润比例；地面阴影同步调整。
- 人物脚底所在格四角为 `(329,737)、(459,759)、(432,840)、(305,818)`。读取四帧源图 alpha>100 的脚部下轮廓，最小格线净距分别为 16.845、15.627、15.427、5.285 母版像素，均在格内。核对数据：`output/playwright/home-v7-grounding.json`。格线按钮新增浅绿色人物格边界。
- 汗滴改为六个不同方向的抛物线飞散粒子，憋劲阶段从头部周围向左、右、上方迸出，随后受重力下落并淡出；轨迹与朝向一致，循环首尾透明。
- 当前截图：`output/playwright/home-v7-detail.png`；人物/箱子格线：`output/playwright/home-v7-detail-grid.png`；5.2 秒运行录像：`output/playwright/home-v7-detail.webm`。
- 本次 26 项首页专项测试通过；微信环境和真机仍未验收。


## 2026-10-23 箱体与节奏精修

- 箱体改为 Canvas 三面木箱，木板、边框、斜撑与铆钉直接沿格子投影绘制，移除旧 crate-v1 图片运行时依赖和三角贴图拉伸。落地范围与高度保持不变。
- 发力周期从 2.4 秒缩短到 1.6 秒，完整姿势统一加速，人物尺寸、手掌锚点与格内脚底不变。
- 汗滴从六颗减到两颗，半径降到约 6.5 母版像素，左右错开发射，生命周期 0.65 秒。
- 浏览器实际 HomePage 预览：output/playwright/home-v7-polish.png、home-v7-polish.webm。微信开发者工具及真机未验收。


## 2026-10-23 恢复原木箱与增大发力

上节程序绘制木箱已撤回。恢复 crate-v1.png 原有橙色木纹、交叉木板、铆钉与高光；分面贴图细分为 4×4 网格，减轻两大三角接缝，底面仍对齐原格子。汗滴左右各两颗，半径均为 8.5，不再缩小。保留 1.6 秒循环，完整姿势叠加以手掌为支点的 0–0.11 弧度前倾；人物等比缩放从 .42 微调到 .40，为后脚留出摆动空间。逐 0.01 秒检查一个循环的脚底 alpha 边界，最小格内余量为 2.13 母版像素。

浏览器预览：output/playwright/home-v7-restored.png 与 home-v7-restored.webm；26 项首页测试通过，微信真机尚未检查。


## 2026-10-23 人物大小与原箱体比例

人物 scale .40→.44，手掌锚点 [456,739]→[468,747]，等比放大 10% 并下移；保留前倾和四颗汗滴。脚底轮廓在四姿势、0/.055/.11 弧度下检查，最小格内余量约 3.89 母版像素。

删除箱子的全部分面网格贴图，原 crate-v1 整图只绘制一次，使用统一 .22 缩放、水平镜像与 .11 弧度旋转。保留素材自身透视，因此不再强求每条深度边平行地图格线；实际底面四角均在对应格子内，最小余量约 4.12 像素。以真实底面更新 HOME_CRATE.floor 调试线。预览 home-v7-proportions.png / .webm；微信真机待验收。


## 2026-10-23 格线方向校正

根据用户要求，箱子底面改为实测格子的内缩四边形（u=.1–.9，v=.23–.83），落地边随格子的两个方向，竖边保持垂直。继续使用原木箱贴图；纠正顶面和正面镜像方向，使三个面对应同一朝向，并缩短顶面深度，避免此前顶面过长。人物大小、位置和动画不变。对齐证据 output/playwright/home-v7-aligned-grid.png，干净预览 home-v7-aligned.png。
