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
  const [poseLeft, poseRight] = POSES[frame];
  const left = poseLeft - 2;
  const right = poseRight + 2;
  const characterWidth = (right - left) * unit;
  const crateX = 70;
  const characterX = crateX - (poseRight - left) * unit + 1;
  const characterRight = characterX + characterWidth;
  const previousRight = frame > 0 ? POSES[frame - 1][1] : left;
  const nextLeft = frame < POSES.length - 1 ? POSES[frame + 1][0] : right;
  const handInset = Math.max(0, previousRight - left + (frame > 0 ? 1 : 0)) * unit;
  const heelInset = Math.max(0, right - nextLeft + (frame < 7 ? 1 : 0)) * unit;
  ctx.fillStyle = 'rgba(65, 38, 12, 0.18)';
  for (const [cx, rx] of [[characterWidth / 2, 27], [crateX + 32, 32]]) {
    ctx.beginPath();
    ctx.ellipse(cx, 0, rx, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  // Only mask the neighboring hand at arm height. A fixed inset running all
  // the way to the top cuts the hair off the narrower walking poses.
  ctx.beginPath();
  ctx.moveTo(characterX, -characterHeight - 2 * unit);
  ctx.lineTo(characterRight, -characterHeight - 2 * unit);
  ctx.lineTo(characterRight, -26);
  ctx.lineTo(characterRight - heelInset, -26);
  ctx.lineTo(characterRight - heelInset, 2 * unit);
  ctx.lineTo(characterX, 2 * unit);
  ctx.lineTo(characterX, -26);
  ctx.lineTo(characterX + handInset, -26);
  ctx.lineTo(characterX + handInset, -56);
  ctx.lineTo(characterX, -56);
  ctx.closePath();
  ctx.clip();
  const drawn = drawHomeRegion(ctx, 'pushCharacterCycle', [left, 88, right - left, 184],
    characterX, -characterHeight - 2 * unit, characterWidth, 184 * unit);
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
