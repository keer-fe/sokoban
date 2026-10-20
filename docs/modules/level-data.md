# 关卡数据模块

## 文件

- `docs/levels-original.json`：固定版本的 100 关原始数据。
- `docs/levels-index.json`：尺寸、箱子数、目标数等元数据。
- `docs/levels.xsb`：XSB 文本格式。
- `docs/atlas.html`：用于研究和筛选的离线地图册。
- `src/game/maps.js`：运行时地图数据，保持原编号和格子编码。

## 来源

数据整理自 Selfboot AI Gallery 的固定提交：

`8ac6e0a7748df9437bb4314139bae1d87919e2b1`

原始文件：

https://github.com/selfboot/ai_gallery/blob/8ac6e0a7748df9437bb4314139bae1d87919e2b1/src/app/%5Blang%5D/games/sokoban/levels.json

## 数据约束

- 共 100 关，保留原始编号和布局。
- 地图外空洞不可行走。
- 箱子数必须等于目标数，每关只能有一个初始角色。
- 运行时数据变更后必须同步更新目录测试和资源预览。
- 箱子数量和地图面积不等于实际难度。

## 求解状态

只有经过求解器逐步验证并写入最少移动步数的关卡才参与星级门槛计算。其余关卡可以游玩和保存最佳步数，但不能把普通解法称为最优解。

## 授权边界

现有资料未确认原地图的完整作者来源和商业授权范围。数据整理和地图册仅用于研究、筛选与开发验证，不构成商业使用授权。
