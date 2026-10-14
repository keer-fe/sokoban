import { circle, line, panel } from '../../ui/draw.js';
import { drawHomeRegion } from '../../ui/home-icons.js';
import { PUSH_MASKS } from './push-masks.js';

// The sheet is not evenly spaced: anchor each pose by its palm and sole.
const POSES = [[4, 150], [147, 282], [287, 413], [406, 545],
  [539, 676], [679, 812], [816, 945], [940, 1081]];

// Keep the character centered while the floor moves beneath its feet.
export function drawPushAnimation(ctx, width, baseline, elapsed) {
  const groupWidth = 136;
  // Leave room for the shortcut icons on both sides of the central scene.
  const scale = Math.max(1, Math.min(1.7, (width - 180) / groupWidth));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, baseline - 96 * scale, width, 176 * scale);
  ctx.clip();
  drawPushGroup(ctx, (width - groupWidth * scale) / 2, baseline, elapsed, scale);
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
  const [, poseRight] = POSES[frame];
  const mask = PUSH_MASKS[frame];
  const left = Math.min(...mask.map(band => band[2]));
  const right = Math.max(...mask.map(band => band[3]));
  const characterWidth = (right - left) * unit;
  const crateX = 70;
  const characterX = crateX - (poseRight - left) * unit + 1;
  ctx.fillStyle = 'rgba(65, 38, 12, 0.18)';
  for (const [cx, rx] of [[characterWidth / 2, 27], [crateX + 32, 32]]) {
    ctx.beginPath();
    ctx.ellipse(cx, 0, rx, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  // Use the measured silhouette, not a rectangular crop or guessed insets:
  // neighboring poses overlap in x at different heights throughout the sheet.
  ctx.beginPath();
  for (const [y, height, start, end] of mask) {
    ctx.rect(characterX + (start - left) * unit, (y - 270) * unit,
      (end - start) * unit, height * unit);
  }
  ctx.clip();
  const drawn = drawHomeRegion(ctx, 'pushCharacterCycle', [left, 87, right - left, 186],
    characterX, -characterHeight - 3 * unit, characterWidth, 186 * unit);
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
