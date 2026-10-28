# 首页纯背景候选 v1

2026-10-21 使用内置 imagegen，根据已确认的 `images/visual-v1/reference/首页视觉母版.png` 编辑生成。

- 文件：[background-candidate-v1.png](background-candidate-v1.png)。
- 实测：941 × 1672 PNG，不含 alpha；SHA-256：`6722678051da82eb431d6125a3bee65386fb13f1819b084e1db33691557a1d33`。
- 状态：用户已确认；正式原件已保存到 `images/visual-v1/home/background-v1.png`。保留无损 PNG，不为符合原计划扩展名而转换；未接入运行时或上传云端，包体与目标构建待验证。
- 初检：移除 Logo、中央棋盘及其角色/箱子/目标、左右图标与下方按钮；保留天空、左上树木、外围围栏、花草和岩石，中央补成草地。
- 本目录为生成过程资料。验收后再确定正式导出格式和尺寸，交付到 `images/visual-v1/home/` 并更新消费代码及包配置。

## 完整生成提示词

```text
Use case: precise-object-edit. Asset type: clean portrait background layer for a WeChat Sokoban game homepage. Input image is the approved homepage master and EDIT TARGET. Remove only all foreground UI and the central miniature game board: remove entire Chinese logo/subtitle, both side settings/chat icons and their attached decorations, all three bottom buttons including text and icons, entire central stone-walled checkerboard diorama including its base, character, crate, glowing goal and attached shrubs/stones/shadows. Seamlessly fill those removed regions with naturally continuous quiet sunlit grass matching the existing surrounding meadow. Preserve original portrait ~9:16 framing, camera, horizon position, blue sky and clouds at top, upper-left tree and trunk, peripheral wooden fence, distant bushes, peripheral flowers and rocks, foreground edge foliage, warm sunlight from upper left, original rich warm green palette and soft painterly 2.5D cartoon material. Keep central and lower-middle lawn open and low-detail for later independent scene and UI layers. Do not invent paths, structures, new objects or characters. No lettering, logo, buttons, icons, panels, board, grid, stone enclosure, character, crate, target, sparkles from removed goal, or watermark. Opaque full-bleed background, faithful environmental reconstruction rather than redesign. Output a single high-resolution portrait image.
```
