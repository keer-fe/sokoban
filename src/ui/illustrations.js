import { circle, line, panel, text } from './draw.js';
import { theme } from './theme.js';

// Vector drawings use a local coordinate space and work at any device pixel ratio.
export function illustration(ctx, kind, x, y, size, options = {}) {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate(options.rotation || 0);
  ctx.translate(-size / 2, -size / 2);
  ctx.scale(size / 44, size / 44);
  if (kind === 'crate' || kind === 'done') {
    const done = kind === 'done';
    panel(ctx, 2, 2, 40, 40, { fill: done ? '#2ECC71' : '#D9944E' });
    panel(ctx, 7, 7, 30, 30, { fill: done ? '#28B162' : '#AA733C', lineWidth: 2, radius: 3 });
    panel(ctx, 12, 12, 20, 20, { fill: done ? '#33E27D' : '#CD8C4A', lineWidth: 2, radius: 2 });
    if (done) line(ctx, [[12, 23], [20, 31], [33, 15]], '#0F5C33', 5);
    else {
      panel(ctx, 19, 7, 6, 30, { fill: '#D9944E', lineWidth: 1.8, radius: 0 });
      panel(ctx, 7, 19, 30, 6, { fill: '#D9944E', lineWidth: 1.8, radius: 0 });
      panel(ctx, 9, 9, 5, 4, { fill: 'rgba(255,255,255,0.35)', lineWidth: 0, radius: 1 });
    }
  } else if (kind === 'target') {
    circle(ctx, 22, 22, 15, '#FFE87C', 3);
    circle(ctx, 22, 22, 9, theme.star, 2.5);
    circle(ctx, 22, 22, 4, '#C9810E', 2.5);
  } else if (kind === 'question') {
    panel(ctx, 2, 2, 40, 40, { fill: theme.yellow, shadow: options.shadow ? theme.ink : null });
    text(ctx, '?', 22, 23, { size: 24 });
  } else if (kind === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const radius = i % 2 ? 10 : 20;
      const px = 22 + Math.cos(angle) * radius;
      const py = 22 + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = theme.star;
    ctx.fill();
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  ctx.restore();
}

export function cloud(ctx, x, y, width) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(width / 128, width / 128);
  ctx.beginPath();
  ctx.moveTo(18, 52);
  ctx.bezierCurveTo(4, 52, 2, 38, 12, 30);
  ctx.bezierCurveTo(8, 14, 28, 4, 40, 14);
  ctx.bezierCurveTo(48, 0, 74, 0, 82, 16);
  ctx.bezierCurveTo(96, 8, 116, 18, 112, 34);
  ctx.bezierCurveTo(126, 38, 126, 52, 112, 52);
  ctx.closePath();
  ctx.fillStyle = theme.white;
  ctx.fill();
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

export function logo(ctx, x, y, size = 100) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  panel(ctx, 0, 0, 100, 100, { fill: theme.yellow, lineWidth: 4, radius: 8, shadow: theme.ink });
  panel(ctx, 10, 10, 80, 80, { fill: theme.yellow, lineWidth: 4, radius: 8 });
  [16, 42, 68].forEach((left, index) => panel(ctx, left, 16, index === 2 ? 16 : 20, 20,
    { fill: theme.brick, lineWidth: 2, radius: 3 }));
  panel(ctx, 38, 68, 24, 18, { fill: '#E74C3C', lineWidth: 2.5, radius: 6 });
  panel(ctx, 44, 74, 12, 7, { fill: '#2ECC71', lineWidth: 2, radius: 2 });
  circle(ctx, 50, 56, 11, '#FFE0B1', 2.5);
  circle(ctx, 46, 57, 2, '#333333');
  circle(ctx, 54, 57, 2, '#333333');
  ctx.beginPath();
  ctx.moveTo(46, 62);
  ctx.quadraticCurveTo(50, 65, 54, 62);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#333333';
  ctx.stroke();
  ctx.restore();
}

export function ground(ctx, width, height, bottomInset = 0) {
  const grassTop = height - bottomInset - 80;
  const brickTop = grassTop - 36;
  const brickWidth = width / 8;
  for (let i = 0; i < 8; i += 1) {
    panel(ctx, i * brickWidth, brickTop, brickWidth, 36,
      { fill: theme.brick, radius: 0 });
    line(ctx, [[i * brickWidth + 6, brickTop + 28], [i * brickWidth + 6, brickTop + 6],
      [(i + 1) * brickWidth - 6, brickTop + 6]], 'rgba(255,255,255,0.3)', 2);
  }
  panel(ctx, -3, grassTop, width + 6, height - grassTop + 3,
    { fill: theme.green, radius: 0, lineWidth: 4 });
  panel(ctx, -3, grassTop - 12, width + 6, 12, { fill: theme.grass, radius: 0 });
}
