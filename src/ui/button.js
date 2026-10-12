import { circle, panel, text } from './draw.js';
import { theme } from './theme.js';

export function contains(rect, point) {
  return point.x >= rect.x && point.x <= rect.x + rect.width
    && point.y >= rect.y && point.y <= rect.y + rect.height;
}

export function drawButton(ctx, button, pressed = false) {
  const { x, y, width, height, label, primary } = button;
  const shift = pressed ? theme.shadow : 0;
  ctx.save();
  ctx.translate(shift, shift);
  panel(ctx, x, y, width, height, {
    fill: primary ? theme.yellow : theme.white,
    radius: theme.radius,
    lineWidth: theme.border,
    shadow: pressed ? null : primary ? theme.yellowShadow : theme.ink,
  });
  if (primary) {
    circle(ctx, x + width / 2 - 68, y + height / 2, 14, theme.ink);
    ctx.beginPath();
    ctx.moveTo(x + width / 2 - 72, y + height / 2 - 7);
    ctx.lineTo(x + width / 2 - 61, y + height / 2);
    ctx.lineTo(x + width / 2 - 72, y + height / 2 + 7);
    ctx.closePath();
    ctx.fillStyle = theme.white;
    ctx.fill();
  }
  text(ctx, label, x + width / 2 + (primary ? 18 : 0), y + height / 2,
    { size: primary ? 20 : 16, spacing: primary ? 3 : 2 });
  ctx.restore();
}

// A click must start and finish on the same button. Dragging out cancels it.
export class ButtonInput {
  constructor(getButtons, onActivate) {
    this.getButtons = getButtons;
    this.onActivate = onActivate;
    this.reset();
  }

  reset() { this.activeId = null; this.pointerId = null; }

  handle(type, point) {
    if (type === 'cancel') { this.reset(); return; }
    if (type === 'start') {
      if (this.pointerId !== null) return;
      const button = this.getButtons().find((item) => contains(item, point));
      if (button) { this.activeId = button.id; this.pointerId = point.id; }
      return;
    }
    if (point.id !== this.pointerId) return;
    const button = this.getButtons().find((item) => item.id === this.activeId);
    if (type === 'move' && button && !contains(button, point)) this.reset();
    if (type === 'end') {
      this.reset();
      if (button && contains(button, point)) this.onActivate(button.id);
    }
  }
}
