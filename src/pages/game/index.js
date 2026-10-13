import { Screen, header } from '../../ui/screen.js';
import { drawBoard } from '../../ui/board.js';
import { text } from '../../ui/draw.js';
import { illustration } from '../../ui/illustrations.js';
import { theme } from '../../ui/theme.js';

export class GamePage extends Screen {
  layout() {
    this.top = this.viewport.safeTop + 20;
    const y = this.top;
    const bottom = this.viewport.height - this.viewport.safeBottom;
    this.statusY = bottom - 268;
    this.boardBounds = { x: 8, y: y + 84, width: 398, height: this.statusY - 16 - (y + 84) };
    const controls = bottom - 212;
    this.controlsY = controls;
    this.buttons = [
      { id: 'levels', label: '‹', x: 18, y, width: 44, height: 44, fontSize: 30 },
      { id: 'menu', label: '☰', x: 352, y, width: 44, height: 44, fontSize: 24 },
      { id: 'undo', label: `↶ 撤销 · ${this.controller.progress.state.cards}`, x: 18,
        y: this.statusY, width: 164, height: 44, fontSize: 17 },
      ...[['up', '↑', 174, controls], ['left', '←', 108, controls + 66],
        ['right', '→', 240, controls + 66], ['down', '↓', 174, controls + 132]]
        .map(([id, label, x, buttonY]) => ({ id, label, x, y: buttonY, width: 62, height: 62,
          fill: theme.green, color: theme.white, fontSize: 32 })),
    ];
    if (this.controller.replay) {
      const c = this.controller;
      this.buttons = [
        { id: 'replay-exit', label: '返回', x: 18, y, width: 64, height: 44, fontSize: 16 },
        ...[['replay-back', '上一步'], ['replay-play', c.replay.playing ? '暂停' : c.game.complete ? '再播放' : '播放'],
          ['replay-forward', '下一步']].map(([id, label], i) => ({ id, label, x: 24 + i * 125,
          y: controls + 30, width: 115, height: 48, fontSize: 17,
          disabled: id === 'replay-back' ? c.game.state.steps === 0 : id === 'replay-forward' && c.game.complete })),
        { id: 'replay-reset', label: '回到起点', x: 139, y: controls + 100, width: 136, height: 44, fontSize: 17 },
      ];
    }
    if (this.controller.game && Math.max(this.controller.game.board.width, this.controller.game.board.height) > 12) {
      this.buttons.push({ id: 'zoom', label: this.controller.zoom ? '查看全图' : '放大棋盘',
        x: 304, y: this.controller.replay ? controls + 105 : controls + 12, width: 92, height: 36, fontSize: 13 });
    }
  }
  render(ctx, elapsed = 0) {
    this.layout();
    const c = this.controller;
    const game = c.game;
    header(ctx, this.top, `第 ${c.levelIndex + 1} 关`, c.replay ? '解法回放 · 不影响成绩和撤销卡' : game.level.name);
    drawBoard(ctx, game, this.boardBounds, c.zoom, elapsed);
    text(ctx, c.replay ? `${game.state.steps} / ${c.replay.moves.length} 步` : `${game.state.steps} 步`, 387, this.statusY + 22,
      { size: 22, color: theme.yellow, outline: 1, align: 'right' });
    if (!c.replay) illustration(ctx, 'crate', 186, this.controlsY + 76, 42);
    this.drawButtons(ctx);
  }
}
