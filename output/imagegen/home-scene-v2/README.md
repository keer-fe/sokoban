# 首页中央动画 v2 · 原稿像素分层

## v4 动画连续性修正（当前）

v3 重绘帧的脸部、躯干不一致导致切帧抽搐。当前运行时 `drawSteadyHero` 只取 v3 图集第 0 帧，按腿部轮廓裁切，用同一姿势的刚体关节转动代替整张帧序列。头部/手掌/上身固定；后腿最大 -0.10 弧度，前腿 0.055 弧度，2.8 秒余弦缓入缓出循环。没有拉伸和交叉淡化，不宣称完整步行动作。原 8 帧播放工具保留，但首页和对照页均调用新函数。

目标增加扩散椭圆光圈、76 像素上浮星芒（母版坐标），透明度随生命周期淡入淡出，循环边界不瞬移可见星芒。提高光束和呼吸光变化幅度，静态目标不闪动。浏览器相位图 `v4-0.png`、`v4-0.7.png`、`v4-1.4.png`、`v4-2.1.png`；22 项测试、语法检查通过，真机待验收。本次未生成新图片，沿用 v3 素材。

## v3 修正（当前运行时）

用户指出 v2 的网格形变看起来像拉伸，该方案已停用，`deformHeroPoint` 已删除。用内置 imagegen 重新绘制 8 个屈膝、抬脚、手臂发力的姿势，原始输出为本目录 `hero-articulated-source-v3.png`。`tools/home-hero-v3-bake.html` 以同一个 0.46 等比系数裁切所有姿势，只平移对齐手掌 `(450,765)`，没有形变、逐帧缩放或补间拉伸。最终 `images/visual-v1/home/hero-push-frames-v3.png` 为 736×416 RGBA，4×2 布局，8 帧 / 1.2 秒；`diorama-base-v3.png` 为 860×660 RGBA，地面修复范围扩大以清除旧人物轮廓。已有 v2 文件仅供历史对照。

新帧与原稿的脸部、手势、身体比例存在差异，这是重绘动画的实际限制；当前不宣称 1:1 或真机验收完成。逐帧预览保存为 `output/playwright/home-scene-v2/v3-*.png`。

实际生成提示词（内置工具，输入为首页母版）：

```text
Create a production TRANSPARENT RGBA sprite atlas, 4 columns by 2 rows, exactly EIGHT equally sized cells, no text or borders. Isolate the SAME yellow explorer from reference (yellow hard hat blue headlamp, blue overalls, cream gloves, brown backpack and boots), same 3/4 elevated camera facing RIGHT. Animate an actual articulated pushing cycle against an invisible immovable crate: hands remain at exactly same contact coordinate in every cell, helmet and head keep rigid identical size and shape, no squash stretch or rubber warping. Eight successive DIFFERENT anatomical poses: 1 bent elbows neutral crouch feet apart; 2 rear heel lifts knee bends; 3 rear boot moves forward under hip while front leg braces; 4 rear boot lands, elbows flex and shoulder rotates; 5 opposite heel lifts; 6 opposite knee bends and boot moves back; 7 both boots brace and elbows extend; 8 return nearly to first pose. Keep motion modest but clearly visible in boots, knees and elbow angles. NO whole-body rescaling, NO identical repeated poses. Every cell character same scale, both glove contact points fixed at 82 percent cell width / 59 percent cell height, bottom planted boot baseline 88 percent height, helmet top around 10 percent height. Each isolated full character fits within cell with generous transparent margins. No crate no ground no shadow no background no scenery no checkerboard. Preserve character identity and painterly warm 2.5D rendering from source, eight carefully drawn animation poses.
```

2026-10-21。母版为 `images/visual-v1/reference/首页视觉母版.png`，941×1672。

## 实现与产物

- `images/visual-v1/home/diorama-base-v2.png`：860×660 RGBA。原稿场景的不规则轮廓提取，外沿 5 px 羽化；保留原石墙、箱子和目标底格。人物背后与目标上方使用生成的局部修复，不替换其他区域。
- `images/visual-v1/home/hero-push-frames-v2.png`：736×832 RGBA，4×4 共 16 帧，每格 184×208，周期 1.6 秒。原稿人物纹理经局部网格形变导出，肩部与膝盖小幅发力，手掌与双脚锚点固定。不是新绘制的行走动作，不是整个角色平移或缩放。
- 母版裁切区域 `(45,435,860,660)`；人物图集放置坐标 `(288,622)`；手掌 `(444,759)`，前脚 `(401,811)`，后脚 `(333,789)`。
- `src/pages/home/scene-animation.js` 保存坐标、形变、时间相位及独立光效；`src/ui/home-visual-v1.js` 加载新素材，`src/pages/home/index.js` 消费。所有中央图层统一等比缩放。
- `tools/home-scene-bake.html` 为可复现的 Canvas 提取、局部补绘合成与图集烘焙工具。两张 clean plate 保存在本目录；没有用 Python 编辑图片。
- `tools/home-scene-review.html` 为原稿/正式运行时对照，支持暂停、拖动时间轴；`tools/home-visual-preview.html` 为完整首页双尺寸预览。

## 生成方式与提示词

使用内置 imagegen，未使用 CLI/API fallback。两次输入均为同一母版；下列为实际提示词。

### hero-clean-plate.png

```text
Use case: precise-object-edit. EDIT TARGET: the supplied 941x1672 approved homepage image. Create a restoration clean plate. Preserve the original entire image, its framing, all pixels, every stone, grass tile, crate, golden goal, logos and buttons as closely as possible. CHANGE ONLY ONE THING: remove the yellow-hat explorer character (roughly x=299..459, y=634..817 in the original) and his contact shadow. Carefully reconstruct the sandstone and grass floor hidden behind him, with exact tile perspective and texture consistent with surrounding tiles. Keep the wooden crate exactly unchanged at x=431..567 y=697..857, including its left edge behind the gloved hand; rebuild only the small hidden edge. Do not change ANY other objects. Do not redesign, shift, resize or reinterpret the maze or illustration. Same complete portrait framing and original aspect ratio. This is a clean plate for a tiny original-pixel restoration patch, not a new design.
```

### light-clean-plate.png

```text
Use case: precise-object-edit. Edit the provided 941x1672 homepage with maximum fidelity, exact original framing. Change ONLY the airborne golden sparkles and vertical light rays floating immediately above the golden star goal (original x=609..703, y=690..791). Remove these floating white stars and vertical light shafts, restoring the grass / sandstone floor underneath. KEEP the actual golden rounded square star floor goal at x=574..701 y=781..876 exactly unchanged. KEEP the character, crate, all wall blocks, all floor tiles, every other detail absolutely unchanged. This is a clean plate for extracting a small background restoration patch only. No redesign. No blur, no extra objects. Same portrait composition, camera and aspect ratio.
```

## 验证与限制

- 首页相关 20 项测试通过，`npm run check` 通过；涵盖分包引用、RGBA 尺寸、帧行列、时间推进、锚点不漂移及等比缩放。
- Playwright 浏览器检查完整首页 414×896、320×568；中央动画对照保存于 `output/playwright/home-scene-v2/`。
- 原稿只提供一个姿势，本版本是小幅原地发力循环；新露出的地面、外轮廓羽化和程序光效不属于逐像素还原。
- 未执行微信开发者工具、上传包体验收或真机验证。沿用现有本地 visualHome 分包；未上传云存储。旧 v1 文件保留，后续发布仍需检查整个分包体积并清理未使用资源。
