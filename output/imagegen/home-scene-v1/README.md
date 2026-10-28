# 首页中央场景分层候选 v1

2026-10-21 使用内置 imagegen，以已确认首页母版为整体参考，生成整体彩景，再从整体彩景分别制作静态底座、人物、木箱与目标。所有文件为 1448×1086 PNG，含 alpha；当前仅是候选。各独立图的画布坐标未对齐，不能直接按相同位置叠加。人物姿态与原稿存在细节漂移，木箱透视、目标光晕和石墙排列需要合成对照后才能交付。人物单图只作造型参考，不是推箱帧动画；目标单图只作光效参考，不是可运行的发光循环。没有将这些素材接入运行时。正式动画交付条件见[首页资产清单](../../../docs/home-assets.md)。

| 文件 | 内容 |
| --- | --- |
| [assembled-candidate-v1.png](assembled-candidate-v1.png) | 整体场景对照 |
| [base-candidate-v1.png](base-candidate-v1.png) | 无人物、木箱、目标的底座 |
| [hero-candidate-v1.png](hero-candidate-v1.png) | 人物候选 |
| [crate-candidate-v1.png](crate-candidate-v1.png) | 木箱候选 |
| [goal-candidate-v1.png](goal-candidate-v1.png) | 目标候选 |

分层须统一锚点：人物脚底、双手接触箱体处、箱体落格点、目标地面中心。接入前需在合成预览中与原确认稿逐项比对，尤其不得改变石墙数量和位置。

## 整体彩景完整提示词

```text
Use case: background-extraction. Edit target: approved Sokoban homepage screenshot. Extract ONLY the central 2.5D miniature stone Sokoban game diorama around the explorer, crate and glowing goal. Preserve all original stones, grass tufts, flowers attached to the diorama, the yellow-hat explorer, wooden crate, target and contact shadows in their original positions. Remove the grass meadow outside its irregular silhouette, both side UI icons, logo, all bottom buttons and any other screen content. Output a single fully assembled diorama on true transparent alpha, with every visible edge and cast shadow intact. No checkerboard baked in; no new or missing wall blocks; no changed character anatomy or box perspective. This is for visual comparison and later independent splitting, so preserve original composition as closely as possible.
```

## 静态底座完整提示词

```text
Use case: precise-object-edit. Input is a transparent assembled Sokoban diorama edit target. Create a STATIC DIORAMA BASE layer: remove only the explorer character, the wooden crate, the glowing goal square and its sparkles, plus their direct shadows/glow; reconstruct the exact underlying floor tiles where those three dynamic objects were. Keep every wall block, floor tile, stone, shrub, flower, grass clump, perspective, lighting, 2.5D camera and exterior irregular silhouette unchanged. Preserve genuine transparent background outside the diorama; do not place it on grass, black, white or checkerboard. Do not add or remove any walls, alter the maze shape or shift viewpoint. This base will be overlaid later with separate character, crate and goal.
```

## 人物完整提示词

```text
Use case: background-extraction. Input image is a transparent assembled Sokoban diorama. Isolate ONLY the small explorer character in yellow headlamp hat, blue clothing, white gloved hands and brown backpack, seen pushing to the right. Preserve exact pose, facial features, whole hands, boots and small contact shadow. Remove the crate and all maze/floor/walls/grass/goal; output one complete explorer cutout with true transparent alpha and generous padding. Do not merge hands into a box; repair any occluded fingers in the original pose. No checkerboard, no new objects, no text.
```

## 木箱完整提示词

```text
Use case: background-extraction. Input is transparent assembled approved-style Sokoban miniature diorama. Extract ONLY the single wooden crate in center being pushed by explorer. Preserve its original perspective (front and top visible), wood cross-bracing, bolts, orange-brown texture, size and contact shadow. Remove character hands, all maze tiles, walls, foliage, glow and scenery. Reconstruct the crate's occluded left edge naturally without changing its shape. One isolated crate on genuine transparent alpha with generous margins. No extra props, no checkerboard, no text.
```

## 目标完整提示词

```text
Use case: background-extraction. Input is transparent assembled Sokoban diorama. Isolate ONLY the glowing golden target square at right of crate: rounded square tile with bright star outline, warm golden glow and tiny floating sparkles. Preserve perspective as a floor tile in the approved scene, with contained glow and soft edges. Remove all other floor tiles, stones, shrubs, crate and character. Output one complete target on true transparent alpha with generous margins, no black background, no checkerboard, no text.
```
