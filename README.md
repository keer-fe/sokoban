# 箱不到八 · Cocos 首页

这是 Cocos Creator 3.8.8 工程。使用 Cocos Creator 打开仓库根目录即可编辑和预览首页。

## 目录

- `assets/HomeStatic.ts`：首页画面布局、按格子绘制的地图和随地图生成的光影。
- `assets/home-static.scene`：首页场景，显式绑定当前使用的图片资源。
- `assets/images/home/background/`：底色。
- `assets/images/home/lighting/`：环境光和接触阴影。
- `assets/images/home/tiles/`：地图方砖。
- `assets/images/home/characters/`、`assets/images/home/objects/`：人物、箱子和目标。
- `assets/images/home/ui/`：标题与按钮。
- `assets/data/levels/`：保留的地图数据集。`classic.json`、`adventure.json`、`coop.json`、`pk.json` 和 `future.json` 是关卡数据；`source/` 保存原始地图与来源索引，`research/` 保存关卡筛选和验证数据。
- `settings/`：Cocos 项目设置。

图片只保留当前首页使用的 32 张，文件名不带版本号。场景按 `HomeStatic.ts` 中 `IMAGE_NAMES` 的顺序绑定图片；新增或调整图片时应同步更新场景绑定。

地图数据集留在工程内供后续玩法开发使用；旧地图图片、旧版首页图片和旧微信小游戏代码均未保留。

当前首页是静态视觉场景，地图由 `HOME_MAP` 中的格子数据绘制。点击地图不会切换画面。

## 构建

可在 Cocos Creator 中选择 Web Desktop 平台构建，起始场景为 `assets/home-static.scene`。构建产物与编辑器缓存由 `.gitignore` 排除。
