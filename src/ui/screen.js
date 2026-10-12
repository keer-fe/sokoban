import { ButtonInput, drawButton } from './button.js';
import { panel, text, circle, line } from './draw.js';
import { illustration } from './illustrations.js';
import { theme } from './theme.js';

export class Screen {
  constructor(controller, onAction) {
    this.controller = controller;
    this.buttons = [];
    this.input = new ButtonInput(() => this.buttons, onAction);
  }
  resize(viewport) { this.viewport = viewport; this.input.reset(); this.layout(); }
  layout() {}
  handlePointer(type, point) { this.input.handle(type, point); }
  pause() { this.input.reset(); }
  drawButtons(ctx) { this.buttons.forEach((button) => drawButton(ctx, button, this.input.activeId === button.id)); }
}

export function header(ctx, top, title, subtitle) {
  panel(ctx, -2, top - 14, 418, 84, { fill: theme.brick, radius: 0, lineWidth: 4 });
  text(ctx, title, 207, top + 15, { size: 25, color: theme.white, outline: 2 });
  text(ctx, subtitle, 207, top + 46, { size: 12, color: theme.yellow });
}

export function stars(ctx, count, x, y, size = 22, gap = 4) {
  for (let i = 0; i < 3; i += 1) {
    ctx.save();
    ctx.globalAlpha = i < count ? 1 : 0.25;
    illustration(ctx, 'star', x + i * (size + gap), y, size);
    ctx.restore();
  }
}

export function lock(ctx, x, y, size = 20) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 20, size / 20);
  ctx.beginPath(); ctx.arc(10, 7, 5, Math.PI, 0);
  ctx.lineWidth = 3; ctx.strokeStyle = '#46546D'; ctx.stroke();
  panel(ctx, 3, 7, 14, 12, { fill: '#46546D', lineWidth: 0, radius: 2 });
  circle(ctx, 10, 12, 2, '#DDE5ED');
  line(ctx, [[10, 13], [10, 16]], '#DDE5ED', 2); ctx.restore();
}
