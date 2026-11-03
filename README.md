# 箱不到八 · Cocos 首页

这是 Cocos Creator 3.8.8 工程。使用 Cocos Creator 打开仓库根目录即可编辑和预览首页及游戏页。

## 目录

- `assets/HomeStatic.ts`：首页布局、游戏页、按格子绘制的地图、移动与撤销交互。
- `assets/home-static.scene`：首页场景，显式绑定当前使用的图片资源。
- `assets/images/home/background/`：底色。
- `assets/images/home/lighting/`：环境光和接触阴影。
- `assets/images/home/tiles/`：地图方砖。
- `assets/images/home/characters/`、`assets/images/home/objects/`：人物、箱子和目标。
- `assets/images/home/ui/`：标题与按钮。
- `assets/data/levels/`：保留的地图数据集。`classic.json`、`adventure.json`、`coop.json`、`pk.json` 和 `future.json` 是关卡数据；`source/` 保存原始地图与来源索引，`research/` 保存关卡筛选和验证数据。
- `assets/resources/levels/classic.json`：供 Cocos 运行时加载的经典关卡副本；更新经典关卡数据时需同步此文件。
- `settings/`：Cocos 项目设置。

图片只保留当前首页使用的 32 张，文件名不带版本号。场景按 `HomeStatic.ts` 中 `IMAGE_NAMES` 的顺序绑定图片；新增或调整图片时应同步更新场景绑定。

地图数据集留在工程内供后续玩法开发使用；旧地图图片、旧版首页图片和旧微信小游戏代码均未保留。

首页地图由 `HOME_MAP` 中的格子数据绘制。点击「开始游戏」进入当前挑战关卡；通关后自动进入下一关，关卡编号、棋盘状态和步数保存在本地存储中。第一关按游戏页视觉稿配置，后续关卡读取 `classic.json`。游戏页使用首页的配色和素材；外围石墙按关卡固定抽样显示，内部隔断墙始终显示，碰撞规则不受外观抽样影响。较长的手机屏幕会扩展背景，并将页眉和操作按钮分别移向上下安全区域。

## 构建

可在 Cocos Creator 中选择 Web Desktop 平台构建，起始场景为 `assets/home-static.scene`。构建产物与编辑器缓存由 `.gitignore` 排除。
