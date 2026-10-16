import { Screen } from '../../ui/screen.js';
import { drawBoard } from '../../ui/board.js';
import { panel, text } from '../../ui/draw.js';
import { drawButton } from '../../ui/button.js';
import { illustration } from '../../ui/illustrations.js';
import { drawLevelsBackground } from '../../ui/home-icons.js';
import { getHomeFont } from '../../ui/home-font.js';

const WOOD = '#4A2716';
const WOOD_LIGHT = '#8B542F';
const CREAM = '#FFF2B5';
const PAPER = '#F8E5B6';
const GREEN = '#58B947';
const GREEN_DARK = '#2E7B31';
const GOLD = '#FFD45A';
const FONT = () => getHomeFont();

function drawMenu(ctx, button, pressed, asset) {
  const shift = pressed ? 3 : 0;
  ctx.save();
  ctx.translate(shift, shift);
  if (asset?.ready) ctx.drawImage(asset.image, button.x, button.y, button.width, button.height);
  else panel(ctx, button.x, button.y, button.width, button.height, {
      fill: GOLD, stroke: WOOD, lineWidth: 4, radius: 12,
      shadow: pressed ? null : WOOD, offset: 4,
    });
  ctx.restore();
}

function drawArrow(ctx, button, pressed) {
  const shift = pressed ? 4 : 0;
  ctx.save();
  ctx.translate(shift, shift);
  panel(ctx, button.x, button.y, button.width, button.height, {
    fill: GREEN, stroke: WOOD, lineWidth: 4, radius: 12,
    shadow: pressed ? null : GREEN_DARK, offset: 5,
  });
  const cx = button.x + button.width / 2;
  const cy = button.y + button.height / 2;
  const points = {
    up: [[cx, cy - 15], [cx - 10, cy - 4], [cx - 4, cy - 4], [cx - 4, cy + 14],
      [cx + 4, cy + 14], [cx + 4, cy - 4], [cx + 10, cy - 4]],
    down: [[cx, cy + 15], [cx - 10, cy + 4], [cx - 4, cy + 4], [cx - 4, cy - 14],
      [cx + 4, cy - 14], [cx + 4, cy + 4], [cx + 10, cy + 4]],
    left: [[cx - 15, cy], [cx - 4, cy - 10], [cx - 4, cy - 4], [cx + 14, cy - 4],
      [cx + 14, cy + 4], [cx - 4, cy + 4], [cx - 4, cy + 10]],
    right: [[cx + 15, cy], [cx + 4, cy - 10], [cx + 4, cy - 4], [cx - 14, cy - 4],
      [cx - 14, cy + 4], [cx + 4, cy + 4], [cx + 4, cy + 10]],
  }[button.id];
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fillStyle = '#FFFDF1';
  ctx.fill();
  ctx.strokeStyle = WOOD;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawUndo(ctx, button, cards, pressed) {
  const shift = pressed ? 3 : 0;
  ctx.save();
  ctx.translate(shift, shift);
  panel(ctx, button.x, button.y, button.width, button.height, {
    fill: PAPER, stroke: WOOD, lineWidth: 4, radius: 12,
    shadow: pressed ? null : '#B57837', offset: 4,
  });
  ctx.beginPath();
  ctx.arc(button.x + 25, button.y + 23, 10, -Math.PI * 0.7, Math.PI * 0.65);
  ctx.strokeStyle = WOOD;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(button.x + 12, button.y + 15);
  ctx.lineTo(button.x + 20, button.y + 14);
  ctx.lineTo(button.x + 17, button.y + 22);
  ctx.fillStyle = WOOD;
  ctx.fill();
  text(ctx, '撤销', button.x + 72, button.y + button.height / 2,
    { size: 17, color: WOOD, font: FONT() });
  panel(ctx, button.x + button.width - 45, button.y + 9, 34, button.height - 18,
    { fill: GOLD, stroke: WOOD, lineWidth: 2, radius: 10 });
  text(ctx, cards, button.x + button.width - 28, button.y + button.height / 2,
    { size: 16, color: WOOD, font: FONT() });
  ctx.restore();
}

export class GamePage extends Screen {
  constructor(controller, onAction) {
    super(controller, onAction);
    this.menuAsset = null;
    this.renderedGame = null;
    this.renderedSteps = null;
    this.renderedBoxes = '';
    this.playerMotion = null;
    if (controller.platform.createImage) {
      const image = controller.platform.createImage();
      this.menuAsset = { image, ready: false };
      image.onload = () => { this.menuAsset.ready = true; };
      image.onerror = () => { this.menuAsset.ready = false; };
      image.src = 'assets/ui/menu-button-v1.png';
    }
  }

  layout() {
    this.top = this.viewport.navigationCenterY - 24;
    const bottom = this.viewport.height - this.viewport.safeBottom;
    const available = bottom - this.top;
    const compact = available < 650;
    this.compact = compact;
    this.headerHeight = 62;
    const controlsHeight = compact ? 154 : 214;
    this.controlsY = bottom - controlsHeight;
    this.statusY = this.controlsY - (compact ? 52 : 60);
    this.boardBounds = {
      x: 18,
      y: this.top + this.headerHeight + 12,
      width: 378,
      height: Math.max(128, this.statusY - (this.top + this.headerHeight + 24)),
    };
    const key = compact ? 48 : 58;
    const gap = compact ? 6 : 8;
    const centerX = 267;
    const verticalTop = this.controlsY + (compact ? 2 : 6);
    this.buttons = [
      { id: 'menu', x: 18, y: this.top, width: 48, height: 48 },
      { id: 'undo', x: 18, y: this.statusY + 4, width: 152, height: 46 },
      { id: 'up', x: centerX - key / 2, y: verticalTop, width: key, height: key },
      { id: 'left', x: centerX - key - gap - key / 2, y: verticalTop + key + gap,
        width: key, height: key },
      { id: 'right', x: centerX + key / 2 + gap, y: verticalTop + key + gap,
        width: key, height: key },
      { id: 'down', x: centerX - key / 2, y: verticalTop + (key + gap) * 2,
        width: key, height: key },
    ];
    if (this.controller.replay) {
      const c = this.controller;
      this.buttons = [
        { id: 'replay-exit', label: '返回', x: 18, y: this.top + 10, width: 70, height: 42, fontSize: 16 },
        ...[['replay-back', '上一步'], ['replay-play', c.replay.playing ? '暂停' : c.game.complete ? '再播放' : '播放'],
          ['replay-forward', '下一步']].map(([id, label], i) => ({ id, label, x: 20 + i * 126,
          y: this.controlsY + 32, width: 116, height: 48, fontSize: 17,
          disabled: id === 'replay-back' ? c.game.state.steps === 0 : id === 'replay-forward' && c.game.complete })),
        { id: 'replay-reset', label: '回到起点', x: 139, y: this.controlsY + 98, width: 136, height: 44, fontSize: 17 },
      ];
    }
    if (this.controller.game && Math.max(this.controller.game.board.width, this.controller.game.board.height) > 12) {
      this.buttons.push({ id: 'zoom', label: this.controller.zoom ? '查看全图' : '放大棋盘',
        x: 304, y: this.controller.replay ? this.controlsY + 100 : this.statusY + 9,
        width: 92, height: 36, fontSize: 13 });
    }
  }

  render(ctx, elapsed = 0) {
    this.layout();
    const c = this.controller;
    const game = c.game;
    const boxes = game.state.boxes.join(',');
    if (this.renderedGame !== game) {
      this.renderedGame = game;
      this.renderedSteps = game.state.steps;
      this.renderedBoxes = boxes;
      this.playerMotion = null;
    } else if (game.state.steps > this.renderedSteps) {
      this.playerMotion = {
        start: elapsed,
        facing: game.state.facing,
        kind: boxes === this.renderedBoxes ? 'walk' : 'push',
      };
      this.renderedSteps = game.state.steps;
      this.renderedBoxes = boxes;
    } else if (game.state.steps !== this.renderedSteps || boxes !== this.renderedBoxes) {
      this.renderedSteps = game.state.steps;
      this.renderedBoxes = boxes;
      this.playerMotion = null;
    }
    const motionAge = this.playerMotion ? elapsed - this.playerMotion.start : Infinity;
    const playerAnimation = motionAge < 0.24 ? {
      kind: this.playerMotion.kind,
      frame: Math.min(2, Math.floor(motionAge / 0.08)),
    } : null;
    if (!drawLevelsBackground(ctx, 0, 0, 414, this.viewport.height, true)) {
      ctx.fillStyle = '#6A95C6';
      ctx.fillRect(0, 0, 414, this.viewport.height);
    }
    ctx.fillStyle = 'rgba(44, 27, 18, 0.18)';
    ctx.fillRect(0, 0, 414, this.viewport.height);

    text(ctx, `第 ${c.campaignLevelNumber()} 关`, 78, this.top + 28,
      { size: 25, color: CREAM, outline: 5, spacing: 2,
        align: 'left', font: FONT() });

    panel(ctx, this.boardBounds.x - 6, this.boardBounds.y - 6,
      this.boardBounds.width + 12, this.boardBounds.height + 12, {
        fill: WOOD_LIGHT, stroke: WOOD, lineWidth: 4, radius: 12,
        shadow: '#352015', offset: 5,
      });
    panel(ctx, this.boardBounds.x, this.boardBounds.y,
      this.boardBounds.width, this.boardBounds.height, {
        fill: '#D7B97D', stroke: '#F5DFA8', lineWidth: 2, radius: 7,
      });
    drawBoard(ctx, game, this.boardBounds, c.zoom, elapsed, playerAnimation);

    if (!c.replay) {
      panel(ctx, 190, this.statusY + 4, 112, 46, {
        fill: '#6C4028', stroke: WOOD, lineWidth: 3, radius: 12,
      });
      text(ctx, '步数', 211, this.statusY + 27,
        { size: 13, color: CREAM, outline: 2, font: FONT() });
      text(ctx, game.state.steps, 276, this.statusY + 26,
        { size: 25, color: GOLD, outline: 3, font: FONT() });
      illustration(ctx, 'crate', 185, this.controlsY + (this.compact ? 58 : 75), this.compact ? 38 : 44);
    } else {
      text(ctx, `${game.state.steps} / ${c.replay.moves.length} 步`, 207, this.statusY + 27,
        { size: 20, color: GOLD, outline: 3, font: FONT() });
    }

    for (const button of this.buttons) {
      const pressed = this.input.activeId === button.id;
      if (button.id === 'menu') drawMenu(ctx, button, pressed, this.menuAsset);
      else if (button.id === 'undo') drawUndo(ctx, button, c.progress.state.cards, pressed);
      else if (['up', 'down', 'left', 'right'].includes(button.id)) drawArrow(ctx, button, pressed);
      else drawButton(ctx, button, pressed);
    }
  }
}
