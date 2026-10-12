import { theme } from './theme.js';

export function panel(ctx, x, y, width, height, options = {}) {
  const { fill = theme.white, stroke = theme.ink, lineWidth = 3, radius = 4,
    shadow = null, offset = 4 } = options;
  ctx.save();
  if (shadow) {
    panel(ctx, x + offset, y + offset, width, height,
      { fill: shadow, stroke: shadow, lineWidth, radius });
  }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

export function text(ctx, value, x, y, options = {}) {
  const { size = 16, color = theme.ink, weight = '900', outline = 0,
    spacing = 0, align = 'center' } = options;
  ctx.save();
  ctx.font = `${weight} ${size}px ${theme.font}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = spacing ? 'left' : align;
  ctx.fillStyle = color;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = outline;
  ctx.lineJoin = 'round';
  const label = String(value);
  const letters = Array.from(label);
  const width = letters.reduce((sum, letter) => sum + ctx.measureText(letter).width, 0)
    + Math.max(0, letters.length - 1) * spacing;
  let left = x - (align === 'center' ? width / 2 : align === 'right' ? width : 0);
  if (spacing) {
    letters.forEach((letter) => {
      if (outline) ctx.strokeText(letter, left, y);
      ctx.fillText(letter, left, y);
      left += ctx.measureText(letter).width + spacing;
    });
  } else {
    if (outline) ctx.strokeText(label, x, y);
    ctx.fillText(label, x, y);
  }
  ctx.restore();
}

export function circle(ctx, x, y, radius, fill, lineWidth = 0, stroke = theme.ink) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

export function line(ctx, points, color = theme.ink, width = 2) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
