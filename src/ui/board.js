import { panel, circle, line } from './draw.js';
import { illustration } from './illustrations.js';
import { theme } from './theme.js';
import { drawArt, playerSprites } from './art.js';

export function drawBoard(ctx, game, bounds, zoom = false, elapsed = 0) {
  const { board, state } = game;
  const fit = Math.min(bounds.width / board.width, bounds.height / board.height);
  const cell = zoom ? Math.max(28, fit * 2) : fit;
  const follow = (count, size, player) => count * cell <= size ? (size - count * cell) / 2
    : Math.max(size - count * cell, Math.min(0, size / 2 - (player + 0.5) * cell));
  const x = bounds.x + follow(board.width, bounds.width, state.player % board.width);
  const y = bounds.y + follow(board.height, bounds.height, Math.floor(state.player / board.width));
  ctx.save();
  ctx.beginPath();
  ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
  ctx.clip();
  for (let row = 0; row < board.height; row += 1) {
    for (let col = 0; col < board.width; col += 1) {
      const pos = row * board.width + col;
      const px = x + col * cell;
      const py = y + row * cell;
      if (board.walls.has(pos)) {
        if (drawArt(ctx, 'wall', px, py, cell)) continue;
        panel(ctx, px, py, cell, cell, { fill: theme.brick, lineWidth: 2, radius: 1 });
        line(ctx, [[px + 2, py + cell / 2], [px + cell - 2, py + cell / 2]], theme.ink, 2);
        line(ctx, [[px + cell / 2, py], [px + cell / 2, py + cell / 2]], theme.ink, 2);
        line(ctx, [[px + cell / 3, py + cell / 2], [px + cell / 3, py + cell]], theme.ink, 2);
        line(ctx, [[px + 4, py + cell / 2 - 4], [px + 4, py + 4], [px + cell - 4, py + 4]], '#E58B50', 2);
      } else if (board.floors.has(pos)) {
        if (!drawArt(ctx, 'floor', px, py, cell)) panel(ctx, px, py, cell, cell, { fill: (row + col) % 2 ? '#F4D6A0' : '#EBC78F',
          stroke: '#D3AB70', lineWidth: 1, radius: 0 });
        if (board.goals.has(pos) && !state.boxes.includes(pos)) {
          // A slow 1.6-second pulse keeps the marker visible even at its dimmest.
          illustration(ctx, 'target', px + 2, py + 2, cell - 4,
            { frameAlpha: 0.65 + 0.35 * Math.cos(elapsed * Math.PI * 2 / 1.6) });
        }
      }
      if (state.boxes.includes(pos)) illustration(ctx, board.goals.has(pos) ? 'done' : 'crate', px + 2, py + 2, cell - 4);
      if (pos === state.player) drawPlayer(ctx, px, py, cell, state.facing);
    }
  }
  ctx.restore();
}

function drawPlayer(ctx, x, y, size, facing = 'down') {
  if (drawArt(ctx, playerSprites[facing] || 'player', x, y, size)) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 44, size / 44);
  panel(ctx, 11, 26, 22, 15, { fill: '#E74C3C', radius: 5, lineWidth: 2 });
  panel(ctx, 17, 31, 10, 7, { fill: '#2ECC71', radius: 2, lineWidth: 1.5 });
  circle(ctx, 22, 18, 12, '#FFE0B1', 2);
  ctx.beginPath(); ctx.moveTo(10, 15); ctx.quadraticCurveTo(10, 1, 23, 3);
  ctx.quadraticCurveTo(34, 2, 35, 14); ctx.lineTo(22, 9); ctx.closePath();
  ctx.fillStyle = '#8B2F00'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
  circle(ctx, 18, 19, 1.7, '#000'); circle(ctx, 26, 19, 1.7, '#000');
  line(ctx, [[18, 24], [22, 26], [26, 24]], '#000', 1.5);
  ctx.restore();
}
