import { circle, line, panel } from '../../ui/draw.js';
import { drawHomeIcon } from '../../ui/home-icons.js';

// The new character and crate travel as one group across the wooden floor.
export function drawPushAnimation(ctx, width, baseline, elapsed) {
  const characterSize = 84;
  const crateSize = 66;
  const groupWidth = characterSize + crateSize - 8;
  const speed = 42;
  const start = -groupWidth - 24;
  const distance = width + groupWidth + 48;
  const duration = distance / speed;
  const time = elapsed % (duration + 0.7);
  if (time > duration) return;

  const x = start + time * speed;
  const gait = time * Math.PI * 4;
  const step = Math.sin(gait);
  const secondStep = step < 0;
  const characterY = baseline - characterSize - Math.abs(step) * 1.5;
  const crateX = x + characterSize - 10;
  const crateY = baseline - crateSize;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, baseline - characterSize - 8, width, characterSize + 12);
  ctx.clip();
  ctx.save();
  ctx.translate(x + characterSize / 2, characterY + characterSize / 2);
  ctx.rotate(step * 0.008);
  if (secondStep) ctx.scale(-1, 1);
  const characterName = secondStep ? 'pushCharacterStep2' : 'pushCharacter';
  const characterDrawn = drawHomeIcon(ctx, characterName,
    -characterSize / 2, -characterSize / 2, characterSize);
  ctx.restore();
  if (!characterDrawn) drawFallbackCharacter(ctx, x, characterY, characterSize);
  ctx.save();
  ctx.translate(crateX + crateSize / 2, crateY + crateSize / 2);
  ctx.rotate(step * 0.008);
  if (!drawHomeIcon(ctx, 'pushCrate', -crateSize / 2, -crateSize / 2, crateSize)) {
    panel(ctx, -crateSize / 2, -crateSize / 2, crateSize, crateSize,
      { fill: '#E8A23E', stroke: '#4B210C', lineWidth: 3, radius: 5 });
  }
  ctx.restore();
  ctx.restore();
}

function drawFallbackCharacter(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 84, size / 84);
  line(ctx, [[52, 56], [75, 48]], '#FFF7DD', 9);
  line(ctx, [[36, 70], [27, 81]], '#4B210C', 10);
  line(ctx, [[58, 70], [66, 81]], '#4B210C', 10);
  panel(ctx, 24, 38, 43, 38, { fill: '#E83232', stroke: '#4B210C', lineWidth: 3, radius: 12 });
  circle(ctx, 49, 30, 19, '#FFD4A0', 3, '#4B210C');
  panel(ctx, 29, 10, 45, 14, { fill: '#35B947', stroke: '#4B210C', lineWidth: 3, radius: 8 });
  ctx.restore();
}
