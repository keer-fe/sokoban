import { Screen, header } from '../../ui/screen.js';
import { panel, text } from '../../ui/draw.js';
import { theme } from '../../ui/theme.js';

export class FriendsPage extends Screen {
  layout() {
    const top = this.viewport.safeTop + 20;
    this.top = top;
    this.bounds = { x: 24, y: top + 92, width: 366,
      height: Math.min(520, this.viewport.height - this.viewport.safeBottom - top - 190) };
    const bottom = this.bounds.y + this.bounds.height;
    this.buttons = [
      { id: 'home', label: '‹', x: 18, y: top, width: 44, height: 44, fontSize: 30 },
      { id: 'friends:refresh', label: '刷新', x: 324, y: top, width: 72, height: 44, fontSize: 15 },
      { id: 'friends:previous', label: '上一页', x: 24, y: bottom + 18, width: 112, height: 44, fontSize: 16 },
      { id: 'friends:next', label: '下一页', x: 278, y: bottom + 18, width: 112, height: 44, fontSize: 16 },
    ];
    const bridge = this.controller.platform.friendBoard;
    if (bridge) bridge.send('resize', { width: this.bounds.width, height: this.bounds.height,
      pixelRatio: Math.min(3, this.viewport.pixelRatio) });
  }
  render(ctx) {
    const isDemo = this.controller.platform.friendBoard && this.controller.platform.friendBoard.demo;
    header(ctx, this.top, '好友闯关榜', isDemo ? '布局演示 · 以下均为模拟数据' : '一起挪箱子，看看谁闯得更远');
    const { x, y, width, height } = this.bounds;
    panel(ctx, x, y, width, height, { fill: theme.white, shadow: theme.ink, radius: 10 });
    const bridge = this.controller.platform.friendBoard;
    if (bridge && bridge.available && bridge.canvas) {
      ctx.drawImage(bridge.canvas, x, y, width, height);
    } else {
      text(ctx, '请在微信小游戏中查看好友榜', 207, y + height / 2 - 15, { size: 17 });
      text(ctx, '浏览器无法读取微信好友数据', 207, y + height / 2 + 20, { size: 13, color: '#68768A' });
    }
    this.drawButtons(ctx);
    text(ctx, '只展示玩过本游戏并上传进度的好友', 207, y + height + 82, { size: 12, color: theme.white });
  }
}
