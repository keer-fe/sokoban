# 公共组件样件 v1

使用内置 imagegen，按已确认母版提取无文字组件。以下为候选样件，未接入运行时；九宫格边距、浅/深底边缘、实际缩放及真机表现待验证。sips 检查确认三个文件均含 alpha 通道，尚不等于透明边缘完整验收。

| 文件 | 实际尺寸 | 参考稿 |
| --- | --- | --- |
| [panel-modal-candidate-v1.png](panel-modal-candidate-v1.png) | 1145×1374 | 首页设置弹窗 |
| [button-primary-candidate-v1.png](button-primary-candidate-v1.png) | 1983×793 | 首页设置弹窗 |
| [button-secondary-candidate-v1.png](button-secondary-candidate-v1.png) | 2134×737 | 首页视觉母版 |
| [button-blue-candidate-v1.png](button-blue-candidate-v1.png) | 2030×775 | 首页视觉母版 |

## 透明与缩放检查

[打开并排预览](preview.html)：奶油底、深绿底、棋盘底，按钮主体显示宽度可在 140–320 px 调整。仅用于素材检查，不是浏览器版游戏。

只读像素分析确认四件素材均有完全透明区域；三种按钮画布最外圈 alpha 为 0。面板最外圈最大 alpha 为 1/255，正式导出前仍需清理极淡边缘并复核阴影。仅检测 alpha 不等于色边、白边已通过视觉验收。

主体边界按 alpha ≥128 测得：主按钮 (170,181)–(1812,622)，次按钮 (221,130)–(1913,609)，蓝按钮 (111,112)–(1918,658)，面板 (71,102)–(1075,1267)。三个按钮主体宽高比分别约 3.72、3.53、3.31，尚未统一几何。预览按主体宽度等比缩放，不拉伸原件；九宫格、实际组件布局与真机均待验证。

## 蓝按钮完整提示词

```text
Use case: background-extraction. Edit target is approved Sokoban homepage. Extract only the light blue ranking button body at bottom right. Remove ALL Chinese lettering, trophy, leaves and flowers, reconstruct blank light blue face. Preserve its green outer rim, blue inner bevel, rounded pill shape, upper-left highlights and lower-right soft shadow. Make a reusable shared blue button, straight front facing, body width to height about 3.5:1 matching other shared buttons. One isolated button on genuine TRANSPARENT alpha, full shadow contained with generous transparent margins. No scenery, icons, text, decorations, extra objects, or checkerboard pattern. Faithfully preserve approved material.
```

## 面板完整提示词

```text
undefined
```

## 主按钮完整提示词

```text
undefined
```

## 次按钮完整提示词

```text
Use case: background-extraction. Edit target: approved homepage. Extract only the cream-colored secondary button body at bottom left. Remove Chinese text, map icon, leaves and flowers, restore blank cream face. Keep green rim, warm cream inset, rounded pill silhouette, soft upper-left highlights and lower-right shadow from original. Reusable shared secondary button, front facing, wide body ratio about 3.5:1 consistent with a primary game button. Output ONE isolated button, TRUE transparent alpha background and ample margins for entire shadow. No scenery, lettering, icons, decoration, panel or baked checkerboard. Preserve reference material, no redesign.
```
