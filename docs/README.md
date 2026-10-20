# 推箱子小游戏文档

本文档目录按代码模块维护。功能行为以对应模块文档和自动化测试为准，历史设想不再混入当前能力说明。

新视觉从 [视觉规范 v1](visual-spec.md) 开始：包含已确认首页母版、统一风格和迁移边界。[首页资产拆分清单](home-assets.md) 记录待生成及接入的资产。旧代码与旧提示词不作为新视觉标准。

## 模块索引

| 模块 | 文档 | 主要代码 |
| --- | --- | --- |
| 工程架构与启动 | [architecture.md](modules/architecture.md) | `game.js`、`src/app.js`、`src/platform/` |
| 首页 | [home.md](modules/home.md) | `src/pages/home/`、`src/ui/home-*` |
| 模式与选关 | [levels.md](modules/levels.md) | `src/pages/levels/`、`src/game/levels.js` |
| 核心玩法 | [gameplay.md](modules/gameplay.md) | `src/game/engine.js`、`src/pages/game/` |
| 进度、存档与回放 | [progress.md](modules/progress.md) | `src/game/progress.js`、`src/game/controller.js` |
| 排行榜 | [leaderboards.md](modules/leaderboards.md) | `open-data/`、`src/platform/*leaderboard*` |
| 在线 PK | [online-pk.md](modules/online-pk.md) | `src/platform/pk-rooms.js`、`cloudfunctions/managePkRoom/` |
| 视觉与资源 | [visual-assets.md](modules/visual-assets.md) | `src/ui/`、`assets/`、`project.config.json` |
| 验证与发布 | [verification.md](modules/verification.md) | `tests/`、`tools/check.js` |
| 关卡数据 | [level-data.md](modules/level-data.md) | `docs/levels-*`、`src/game/maps.js` |

## 资料文件

- `主界面.html`：早期首页设计参考，不是可运行页面，也不是当前视觉规范。
- `atlas.html`：100 关离线地图册，仅用于研究和筛选。
- `levels-original.json`：运行时地图的原始数据来源。
- `levels-index.json`：带尺寸和箱子数量的地图索引。
- `levels.xsb`：标准文本地图。

## 维护规则

- 一个功能只在对应模块文档中说明，其他文档使用链接引用。
- “代码检查通过”“微信开发者工具通过”“体验版通过”“真机通过”必须分别记录，不互相替代。
- 未接入、未部署或未在真实微信环境验证的能力必须明确标为边界，不写成已完成。
- 项目只支持微信小游戏，不维护浏览器运行模式。
