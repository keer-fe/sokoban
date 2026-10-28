# Logo 提取失败记录

2026-10-21 使用内置 imagegen 对已确认母版尝试两次透明提取。第二次输出保存在 `logo-rejected-v1.png`，仅供问题追溯，**禁止作为运行时素材**：标题中“到”的字形被重绘成“至”，不符合“箱不到八”的准确文案。

后续须从原始母版准确提取字形，或制作可编辑的准确字形并与木牌合成；未通过逐字核对前不将 H02 标记完成。

## 第二次完整提示词

```text
Use case: precise-object-edit / background-extraction. The approved homepage screenshot is the EDIT TARGET. Precisely cut out the EXISTING logo pixels at top (roughly x=170..775, y=150..415 in 941x1672 source) including original exact lettering, wood plaque, leaves, flowers, subtitle and shadow. Remove only the surrounding meadow/sky/background; replace with TRUE TRANSPARENT alpha. Do NOT redraw, regenerate, reinterpret, retouch or alter ANY part of the logo. In particular its existing Chinese title MUST remain visually identical to source and read 箱不到八 (four characters 箱 不 到 八); do not change 到 to 至. Subtitle remains 欢乐推箱子. This is pixel-faithful extraction, not a new logo. Center cutout with transparent margins, no checkerboard.
```
