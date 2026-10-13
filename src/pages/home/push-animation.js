import { circle, line, panel } from '../../ui/draw.js';
import { drawHomeRegion } from '../../ui/home-icons.js';

// The sheet is not evenly spaced: anchor each pose by its palm and sole.
const POSES = [[4, 150], [147, 282], [287, 413], [406, 545],
  [539, 676], [679, 812], [816, 945], [940, 1081]];

// The new character and crate travel as one group across the wooden floor.
export function drawPushAnimation(ctx, width, baseline, elapsed) {
  const groupWidth = 136;
  const speed = 32;
  const start = -groupWidth - 24;
  const distance = width + groupWidth + 48;
  const duration = distance / speed;
  const time = elapsed % (duration + 0.7);
  if (time > duration) return;

  const x = start + time * speed;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, baseline - 96, width, 108);
  ctx.clip();
  drawPushGroup(ctx, x, baseline, time, 1);
  ctx.restore();
}

// Loading variant: the group stays centered while the walking cycle keeps moving.
export function drawLoadingPushAnimation(ctx, centerX, baseline, elapsed) {
  drawPushGroup(ctx, centerX - 136 * 1.12 / 2, baseline, elapsed, 1.12);
}

function drawPushGroup(ctx, x, baseline, elapsed, scale) {
  ctx.save();
  ctx.translate(x, baseline);
  ctx.scale(scale, scale);
  // Keep the artwork's native aspect ratio and the palm fixed against the crate.
  const frame = Math.floor(elapsed * 8) % 8;
  const characterHeight = 88;
  const unit = characterHeight / 180;
  const [left, right] = POSES[frame];
  const characterWidth = (right - left) * unit;
  const crateX = 70;
  const characterX = crateX - characterWidth + 1;
  ctx.fillStyle = 'rgba(65, 38, 12, 0.18)';
  for (const [cx, rx] of [[characterWidth / 2, 27], [crateX + 32, 32]]) {
    ctx.beginPath();
    ctx.ellipse(cx, 0, rx, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  // Adjacent poses overlap horizontally at the hands/heels. Exclude those
  // neighboring pixels while retaining this pose's hands and feet.
  ctx.beginPath();
  ctx.moveTo(characterX + 9 * unit, -88);
  ctx.lineTo(crateX + 1, -88);
  ctx.lineTo(crateX + 1, -26);
  ctx.lineTo(crateX + 1 - 12 * unit, -26);
  ctx.lineTo(crateX + 1 - 12 * unit, 0);
  ctx.lineTo(characterX, 0);
  ctx.lineTo(characterX, -26);
  ctx.lineTo(characterX + 9 * unit, -26);
  ctx.closePath();
  ctx.clip();
  const drawn = drawHomeRegion(ctx, 'pushCharacterCycle', [left, 90, right - left, 180],
    characterX, -characterHeight, characterWidth, characterHeight);
  ctx.restore();
  if (!drawn) {
    drawFallbackCharacter(ctx, 0, -88, 88);
  }
  if (!drawHomeRegion(ctx, 'pushCrate', [29, 0, 227, 217],
    crateX, -62, 62 * 227 / 217, 62)) {
    panel(ctx, crateX, -62, 65, 62,
      { fill: '#E8A23E', stroke: '#4B210C', lineWidth: 3, radius: 5 });
  }
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
