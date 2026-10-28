# 首页装饰按钮候选 v1

2026-10-21 按已确认首页母版，使用内置 imagegen 分别提取三枚带花叶的按钮。完整母版是参考图；此目录是生产候选，正式接入前核对与母版的几何、边缘和按钮文案。

| 候选图 | 尺寸 | 装饰与图标 |
| --- | --- | --- |
| [开始游戏](button-start-candidate-v1.png) | 2172×724 | 两侧叶片、右下小花 |
| [选择关卡](button-levels-candidate-v1.png) | 1774×887 | 两侧叶片、左上小花、地图图标 |
| [排行榜](button-ranking-candidate-v1.png) | 1774×887 | 两侧叶片、左上小花、奖杯图标 |

[首页按钮区预览](preview.html)在已确认纯背景上按母版位置展示，文字为独立叠加。

初检：均有透明通道；alpha ≥128 的主体边界分别为开始 `(254,85)–(1900,632)`、选关 `(123,168)–(1661,718)`、排行榜 `(223,182)–(1552,731)`。画布最外圈最大 alpha 为 1/255，正式交付前需清理极淡边缘并核对浅/深底色边。三个素材的主体宽度和透明留白不同，消费代码须按主体可见边界布局，不能等比例使用画布框直接对齐。

## 开始游戏完整提示词

```text
Use case: background-extraction. Edit the approved homepage master. Isolate ONLY the large warm yellow START button in lower middle, preserving its EXACT leaf clusters at upper left and upper right and the small white flower at its lower right, plus the original button rim, brown bevel, highlight and shadow. Remove only the Chinese lettering from the button face and reconstruct blank yellow-orange face. Delete everything outside that button assembly: game scene, grass, other two buttons. Produce one centered, full-width horizontal button asset on genuinely transparent alpha, with all leaves, flower and shadow inside generous canvas margins. The leaves and flower are required; do not simplify them away or relocate them. No text, no other icons, no scenery, no checkerboard.
```

## 选择关卡完整提示词

```text
Use case: background-extraction. Edit approved Sokoban homepage master. Isolate ONLY the small cream and green LEVEL SELECT button at lower left. Preserve the original green leaf cluster and little white daisy attached to its upper-left corner, another leaf cluster at upper-right, and the small folded map icon on left inside the button; preserve rim, cream face, outline, thickness, highlights, shadow. Remove only Chinese lettering on its right and reconstruct clean empty cream area there. Delete all surrounding grass, other UI and buttons. Output single horizontal button on TRUE transparent alpha with generous margins containing leaves and shadow. Keep all small plants and flower: required. No text, no checkerboard, no additional icon.
```

## 排行榜完整提示词

```text
Use case: background-extraction. Edit approved Sokoban homepage master. Isolate ONLY the small light blue RANKING button at lower right. Preserve green leaf clusters and little white daisy attached at its upper-left, plus the exact golden trophy icon inside its left side; retain light blue face, green outer rim, glossy highlights, thickness and contact shadow. Remove only Chinese lettering on the right, reconstruct blank blue face. Delete all surrounding grass, other buttons, game scene. Output one horizontal button with genuine transparent alpha and generous empty margins holding all leaves and shadow. Plants/flower are mandatory and must keep their original placement. No text, no extra icons, no checkerboard baked in.
```
