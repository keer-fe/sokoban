import { Screen, header } from '../../ui/screen.js';
import { drawBoard } from '../../ui/board.js';
import { panel, text } from '../../ui/draw.js';
import { illustration } from '../../ui/illustrations.js';
import { theme } from '../../ui/theme.js';

export class GamePage extends Screen {
  layout() {
    this.top = this.viewport.safeTop + 20;
    const y = this.top;
    this.boardBounds = { x: 33, y: y + 146, width: 348, height: 316 };
    const controls = y + 543;
    this.buttons = [
      { id: 'levels', label: '‹', x: 18, y, width: 44, height: 44, fontSize: 30 },
      { id: 'menu', label: '☰', x: 352, y, width: 44, height: 44, fontSize: 24 },
      { id: 'undo', label: '↶ 撤销', x: 32, y: y + 483, width: 132, height: 48 },
      ...[['up', '↑', 174, controls], ['left', '←', 108, controls + 66],
        ['right', '→', 240, controls + 66], ['down', '↓', 174, controls + 132]]
        .map(([id, label, x, buttonY]) => ({ id, label, x, y: buttonY, width: 62, height: 62,
          fill: theme.green, color: theme.white, fontSize: 32 })),
    ];
  }
  render(ctx) {
    this.layout();
    const c = this.controller;
    const game = c.game;
    const record = c.progress.state.records[game.level.id];
    header(ctx, this.top, `第 ${c.levelIndex + 1} 关`, game.level.name);
    panel(ctx, 26, this.top + 91, 87, 31, { fill: theme.green, lineWidth: 2 });
    text(ctx, game.level.difficulty, 69, this.top + 107, { size: 13, color: theme.white });
    text(ctx, `${game.state.steps} 步`, 211, this.top + 107, { size: 20, color: theme.yellow, outline: 1 });
    text(ctx, record ? `最佳 ${record.bestSteps} 步` : '最佳 —', 387, this.top + 107,
      { size: 13, color: theme.white, align: 'right' });
    drawBoard(ctx, game, this.boardBounds);
    text(ctx, `撤销卡 × ${c.progress.state.cards}`, 289, this.top + 507, { size: 17, color: theme.white, outline: 1 });
    illustration(ctx, 'crate', 184, this.top + 618, 42);
    this.drawButtons(ctx);
    text(ctx, '把所有箱子推到金色目标点', 207, this.top + 752, { size: 12, color: theme.white });
  }
}
