// The homepage UI uses 414 logical pixels. World layers move underneath it.
export const WALK_ATLAS = Object.freeze({
  columns: 4, frames: 12, cellWidth: 362, cellHeight: 362,
  duration: .96,
});

export const SCROLL_SPEED = Object.freeze({ far: 6, meadow: 12, road: 26, foreground: 32 });
const PANORAMA_RATIO = 2087 / 754;
const STRIP_RATIO = 2086 / 754;
const CRATE_RATIO = 1180 / 1333;
const CRATE_WIDTH = 205;
const HERO_WIDTH = 181;
const GOAL_PERIOD_TILES = 2;

export function walkFrameAt(elapsed) {
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  return Math.floor((time % WALK_ATLAS.duration) / WALK_ATLAS.duration * WALK_ATLAS.frames);
}

export function scrollStateAt(elapsed, viewport, scene) {
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const roadHeight = Math.min(280, scene.height * .93);
  const roadWidth = roadHeight * STRIP_RATIO;
  const baseline = scene.y + scene.height * .76;
  return {
    time,
    baseline,
    roadHeight,
    roadWidth,
    roadY: baseline - roadHeight * 530 / 754,
    farWidth: viewport.height * PANORAMA_RATIO,
    foregroundHeight: Math.min(128, viewport.height * .15),
    frame: walkFrameAt(time),
    frameProgress: (time % WALK_ATLAS.duration) / WALK_ATLAS.duration * WALK_ATLAS.frames % 1,
  };
}

// Mirroring every other panel makes the adjoining edge pixel-identical.
export function drawMirroredLayer(ctx, name, art, width, y, tileWidth, tileHeight, distance) {
  if (!(tileWidth > 0) || !(tileHeight > 0)) return;
  const tileIndex = Math.floor(distance / tileWidth);
  const offset = distance % tileWidth;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, y, width, tileHeight); ctx.clip();
  for (let x = -offset, index = tileIndex; x < width; x += tileWidth, index += 1) {
    if (index % 2 === 0) art(name, { x, y, width: tileWidth, height: tileHeight });
    else {
      ctx.save();
      ctx.translate(x + tileWidth, y); ctx.scale(-1, 1);
      art(name, { x: 0, y: 0, width: tileWidth, height: tileHeight });
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawSoftRoadTile(ctx, art, rect) {
  const full = 754;
  const drawSlice = (sourceY, sourceHeight, alpha) => {
    if (alpha <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y + rect.height * sourceY / full,
      rect.width, rect.height * sourceHeight / full + .5);
    ctx.clip();
    ctx.globalAlpha *= alpha;
    art('gardenRoad', rect);
    ctx.restore();
  };
  drawSlice(0, 530, 1);
  for (let sourceY = 530; sourceY < 650; sourceY += 10) {
    const progress = (sourceY + 5 - 530) / 120;
    drawSlice(sourceY, 10, 1 - progress * progress * (3 - 2 * progress));
  }
}

function drawMeadowDetails(ctx, state, scene) {
  ctx.save();
  const period = 900;
  for (let i = 0; i < 9; i += 1) {
    const x = ((i * 117 - state.time * SCROLL_SPEED.meadow) % period + period) % period - 190;
    if (x < -16 || x > 430) continue;
    const y = scene.y + 48 + (i % 3) * 42;
    ctx.fillStyle = 'rgba(52, 132, 42, .24)';
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(x + side * 4, y, 5, 2.7, side * .48, 0, Math.PI * 2); ctx.fill();
    }
    if (i % 3 === 0) {
      ctx.fillStyle = 'rgba(255, 248, 215, .75)';
      for (let petal = 0; petal < 5; petal += 1) {
        const angle = petal * Math.PI * 2 / 5;
        ctx.beginPath(); ctx.ellipse(x + Math.cos(angle) * 4, y - 5 + Math.sin(angle) * 4,
          3.2, 2.1, angle, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#EFC855'; ctx.beginPath(); ctx.arc(x, y - 5, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

export function goalPositionsAt(state, width) {
  const period = state.roadWidth * GOAL_PERIOD_TILES;
  const offset = (state.time * SCROLL_SPEED.road) % period;
  const first = 640 - offset;
  const positions = [];
  for (let x = first - period; x < width + 100; x += period) {
    if (x > -100) positions.push(x);
  }
  return positions;
}

function drawPassingGoals(ctx, art, state, width) {
  for (const x of goalPositionsAt(state, width)) {
    const y = state.baseline - 86;
    art('goalBase', { x: x - 60, y, width: 120, height: 90 });
    const pulse = .5 + .5 * Math.sin(state.time * Math.PI * 2 / 2.4);
    ctx.save();
    const light = ctx.createRadialGradient(x, y + 44, 7, x, y + 44, 62);
    light.addColorStop(0, `rgba(255, 246, 142, ${.26 + pulse * .23})`);
    light.addColorStop(1, 'rgba(255, 234, 111, 0)');
    ctx.fillStyle = light; ctx.fillRect(x - 64, y - 18, 128, 128);
    ctx.strokeStyle = `rgba(255, 250, 172, ${.18 + pulse * .34})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y + 48, 25 + pulse * 9, 13 + pulse * 5, -.08, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function walkGroupPlacement(state, width) {
  const centerX = width / 2;
  const heroX = centerX - 144;
  const heroY = state.baseline - 352 * HERO_WIDTH / WALK_ATLAS.cellHeight;
  return {
    hero: { x: heroX, y: heroY, width: HERO_WIDTH, height: HERO_WIDTH },
    crate: { x: centerX - 37, y: state.baseline - 980 / 1333 * CRATE_WIDTH,
      width: CRATE_WIDTH, height: CRATE_WIDTH * CRATE_RATIO },
  };
}

function drawWalkingGroup(ctx, art, drawFrame, state, width) {
  const centerX = width / 2;
  const { hero, crate } = walkGroupPlacement(state, width);
  ctx.save();
  ctx.fillStyle = 'rgba(67, 45, 20, .22)';
  for (const [x, rx] of [[centerX - 57, 39], [centerX + 55, 40]]) {
    ctx.beginPath(); ctx.ellipse(x, state.baseline + 2, rx, 8, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  art('crate', crate);
  drawFrame(state.frame, hero.x, hero.y, hero.width, hero.height, state.frameProgress);
}

export function drawScrollingHome(ctx, viewport, scene, elapsed, art, drawFrame) {
  const state = scrollStateAt(elapsed, viewport, scene);
  drawMirroredLayer(ctx, 'gardenFar', art, viewport.width, 0,
    state.farWidth, viewport.height, state.time * SCROLL_SPEED.far);
  drawMeadowDetails(ctx, state, scene);
  drawMirroredLayer(ctx, 'gardenRoad', (name, rect) => drawSoftRoadTile(ctx, art, rect),
    viewport.width, state.roadY,
    state.roadWidth, state.roadHeight, state.time * SCROLL_SPEED.road);
  drawPassingGoals(ctx, art, state, viewport.width);
  drawWalkingGroup(ctx, art, drawFrame, state, viewport.width);
  const foregroundWidth = state.foregroundHeight * STRIP_RATIO;
  ctx.save();
  ctx.globalAlpha *= .68;
  drawMirroredLayer(ctx, 'gardenForeground', art, viewport.width,
    viewport.height - state.foregroundHeight, foregroundWidth, state.foregroundHeight,
    state.time * SCROLL_SPEED.foreground);
  ctx.restore();
  return state;
}
