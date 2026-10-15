import { PUSH_MASKS } from './push-masks.js';

const POSES = [[4, 150], [147, 282], [287, 413], [406, 545],
  [539, 676], [679, 812], [816, 945], [940, 1081]];

export const FRIENDS_PUSH_SOURCES = Object.freeze({
  character: 'open-data/assets/push-character-cycle-v2.png',
  crate: 'open-data/assets/push-crate-new.png',
});

export function createFriendsPushAnimation(api, onReady = () => {}) {
  const assets = {};
  if (typeof api.createImage === 'function') {
    Object.entries(FRIENDS_PUSH_SOURCES).forEach(([name, source]) => {
      const entry = { image: api.createImage(), ready: false };
      entry.image.onload = () => { entry.ready = true; onReady(); };
      entry.image.onerror = () => { entry.ready = false; };
      entry.image.src = source;
      assets[name] = entry;
    });
  }

  function draw(ctx, centerX, baseline, tick) {
    const scale = 0.82;
    const frame = tick % POSES.length;
    const characterHeight = 88;
    const unit = characterHeight / 180;
    const [, poseRight] = POSES[frame];
    const mask = PUSH_MASKS[frame];
    const left = Math.min(...mask.map(band => band[2]));
    const right = Math.max(...mask.map(band => band[3]));
    const characterWidth = (right - left) * unit;
    const crateX = 70;
    const characterX = crateX - (poseRight - left) * unit + 1;
    const groupWidth = 136;

    ctx.save();
    ctx.translate(centerX - groupWidth * scale / 2, baseline);
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(65, 38, 12, 0.18)';
    for (const [cx, rx] of [[characterWidth / 2, 27], [crateX + 32, 32]]) {
      drawEllipse(ctx, cx, 0, rx, 3);
    }
    if (assets.character?.ready) {
      ctx.save();
      ctx.beginPath();
      for (const [y, height, start, end] of mask) {
        ctx.rect(characterX + (start - left) * unit, (y - 270) * unit,
          (end - start) * unit, height * unit);
      }
      ctx.clip();
      ctx.drawImage(assets.character.image, left, 87, right - left, 186,
        characterX, -characterHeight - 3 * unit, characterWidth, 186 * unit);
      ctx.restore();
    } else drawFallbackCharacter(ctx, characterX, -88);
    if (assets.crate?.ready) {
      ctx.drawImage(assets.crate.image, 29, 0, 227, 217,
        crateX, -62, 62 * 227 / 217, 62);
    } else drawFallbackCrate(ctx, crateX, -62);
    ctx.restore();
  }

  return { draw };
}

// The WeChat open-data Canvas context does not expose CanvasRenderingContext2D.ellipse.
function drawEllipse(ctx, x, y, radiusX, radiusY) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(radiusX, radiusY);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.restore();
  ctx.fill();
}

function drawFallbackCharacter(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#FFD4A0';
  ctx.strokeStyle = '#4B210C';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(47, 28, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#35B947';
  ctx.fillRect(25, 8, 43, 14); ctx.strokeRect(25, 8, 43, 14);
  ctx.fillStyle = '#E83232';
  ctx.fillRect(24, 42, 40, 34); ctx.strokeRect(24, 42, 40, 34);
  ctx.restore();
}

function drawFallbackCrate(ctx, x, y) {
  ctx.fillStyle = '#E8A23E';
  ctx.strokeStyle = '#4B210C';
  ctx.lineWidth = 3;
  ctx.fillRect(x, y, 65, 62);
  ctx.strokeRect(x, y, 65, 62);
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 8); ctx.lineTo(x + 57, y + 54);
  ctx.moveTo(x + 57, y + 8); ctx.lineTo(x + 8, y + 54);
  ctx.stroke();
}
