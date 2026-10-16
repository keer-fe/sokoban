import { panel, circle, line } from './draw.js';
import { illustration } from './illustrations.js';
import { theme } from './theme.js';
import { drawArt, drawCharacterFrame } from './art.js';
import { areDoorsOpen } from '../game/engine.js';

export function drawBoard(ctx, game, bounds, zoom = false, elapsed = 0, playerAnimation = null) {
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
        if (board.buttons.has(pos)) drawPressureButton(ctx, px, py, cell,
          pos === state.player || state.boxes.includes(pos));
        if (board.goals.has(pos) && !state.boxes.includes(pos)) {
          // A slow 1.6-second pulse keeps the marker visible even at its dimmest.
          illustration(ctx, 'target', px + 2, py + 2, cell - 4,
            { frameAlpha: 0.65 + 0.35 * Math.cos(elapsed * Math.PI * 2 / 1.6) });
        }
        if (board.doors.has(pos)) drawDoor(ctx, px, py, cell,
          areDoorsOpen(board, state) || pos === state.player || state.boxes.includes(pos));
      }
      if (state.boxes.includes(pos)) illustration(ctx, board.goals.has(pos) ? 'done' : 'crate', px + 2, py + 2, cell - 4);
      if (pos === state.player) drawPlayer(ctx, px, py, cell, state.facing, playerAnimation);
    }
  }
  ctx.restore();
}

function drawPressureButton(ctx, x, y, size, pressed) {
  const inset = size * 0.2;
  panel(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2,
    { fill: pressed ? '#42C96B' : '#FFD34E', stroke: '#6B4B1F', lineWidth: Math.max(1, size * 0.06), radius: size * 0.16 });
  circle(ctx, x + size / 2, y + size / 2, size * 0.1, pressed ? '#167A38' : '#D34B32');
}

function drawDoor(ctx, x, y, size, open) {
  if (open) {
    panel(ctx, x + size * 0.05, y + size * 0.04, size * 0.13, size * 0.92,
      { fill: '#63738B', lineWidth: 1, radius: 1 });
    panel(ctx, x + size * 0.82, y + size * 0.04, size * 0.13, size * 0.92,
      { fill: '#63738B', lineWidth: 1, radius: 1 });
    return;
  }
  panel(ctx, x + size * 0.08, y + size * 0.04, size * 0.84, size * 0.92,
    { fill: '#7D8DA5', stroke: '#34445C', lineWidth: Math.max(1, size * 0.05), radius: 2 });
  for (let i = 1; i < 4; i += 1) {
    line(ctx, [[x + size * i / 4, y + size * 0.1], [x + size * i / 4, y + size * 0.9]],
      '#D9E2EE', Math.max(1, size * 0.05));
  }
}

function drawPlayer(ctx, x, y, size, facing = 'down', animation = null) {
  const artSize = size * 1.24;
  if (drawCharacterFrame(ctx, facing, animation?.kind || 'walk', animation?.frame ?? 1,
    x - (artSize - size) / 2, y + size - artSize, artSize)) return;
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
