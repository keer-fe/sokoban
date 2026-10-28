import { WALK_ATLAS } from '../pages/home/scrolling-scene.js';

// All current homepage artwork is local to the visualHome subpackage.
const sources = Object.freeze({
  logo: 'images/visual-v1/home/logo-v1.png',
  gardenFar: 'images/visual-v1/home/garden-panorama-v1.png',
  gardenRoad: 'images/visual-v1/home/garden-road-v2.png',
  gardenForeground: 'images/visual-v1/home/garden-foreground-v1.png',
  walkFrames: 'images/visual-v1/home/hero-walk-push-v1.png',
  crate: 'images/visual-v1/home/crate-left-face-v3.png',
  goalBase: 'images/visual-v1/home/goal-base-v2.png',
  start: 'images/visual-v1/home/button-start-v1.png',
  levels: 'images/visual-v1/home/button-levels-v1.png',
  ranking: 'images/visual-v1/home/button-ranking-v1.png',
  settings: 'images/visual-v1/home/icon-settings-v1.png',
  gameClub: 'images/visual-v1/home/icon-game-club-v1.png',
});

const visible = Object.freeze({
  logo: [24, 20, 1725, 813],
  start: [254, 85, 1646, 547],
  levels: [123, 168, 1538, 550],
  ranking: [223, 182, 1329, 549],
  settings: [236, 241, 795, 764],
  gameClub: [331, 307, 668, 625],
});

const atlases = new WeakMap();
export const homeVisualSources = sources;

export function loadHomeVisuals(ctx, platform) {
  if (!platform.createImage || atlases.has(ctx)) return Promise.resolve();
  const atlas = {};
  atlases.set(ctx, atlas);
  return Promise.all(Object.entries(sources).map(([name, source]) => new Promise((resolve) => {
    const image = platform.createImage();
    const entry = { image, ready: false };
    atlas[name] = entry;
    image.onload = () => { entry.ready = true; resolve(); };
    image.onerror = () => {
      entry.ready = false;
      console.warn(`Home motion asset failed: ${source}`);
      resolve();
    };
    image.src = source;
  })));
}

export function homeMotionReady(ctx) {
  const atlas = atlases.get(ctx);
  return !!atlas && Object.keys(sources).every((name) => atlas[name]?.ready);
}

export function drawHomeVisual(ctx, name, x, y, width, height) {
  const entry = atlases.get(ctx)?.[name];
  if (!entry?.ready) return false;
  const source = visible[name];
  if (source) ctx.drawImage(entry.image, ...source, x, y, width, height);
  else ctx.drawImage(entry.image, x, y, width, height);
  return true;
}

export function walkFootAt(cycle, offset = 0) {
  const p = ((cycle + offset) % 1 + 1) % 1;
  if (p < .6) return { x: 8 - p / .6 * 16, lift: 0 };
  const swing = (p - .6) / .4;
  const smooth = swing * swing * (3 - 2 * swing);
  return { x: -8 + smooth * 16, lift: -10 * Math.sin(swing * Math.PI) };
}

export function drawHomeWalkFrame(ctx, frame, x, y, width, height, progress = 0) {
  const entry = atlases.get(ctx)?.walkFrames;
  if (!entry?.ready) return false;
  const { frames, cellWidth, cellHeight } = WALK_ATLAS;
  const index = Number.isFinite(frame) ? Math.max(0, Math.min(frames - 1, Math.floor(frame))) : 0;
  const scale = width / cellWidth;
  const cycle = ((index + progress) / frames) % 1;
  const drawFoot = (source, stride, baselineOffset) => {
    const [sx, sy, sw, sh] = source;
    ctx.drawImage(entry.image, sx, sy, sw, sh,
      x + sx * scale + stride.x, y + sy * scale + stride.lift + baselineOffset,
      sw * scale, sh * scale);
  };
  drawFoot([27, 282, 130, 80], walkFootAt(cycle), 0);
  drawFoot([149, 282, 134, 80], walkFootAt(cycle, .5), 6);
  // Keep the glove fixed on the crate while the boots alternate support and swing.
  const phase = (index + progress) / frames * Math.PI * 2;
  const palmX = x + width * 314 / cellWidth;
  const palmY = y + height * 236 / cellHeight;
  ctx.save();
  ctx.translate(palmX, palmY);
  ctx.rotate(Math.sin(phase) * .008);
  ctx.translate(-palmX, -palmY);
  // Follow the uneven hem of the overalls so moving legs never expose a straight cut.
  ctx.beginPath();
  const hem = [[0, 0], [362, 0], [362, 278], [282, 278], [266, 288],
    [242, 303], [205, 310], [170, 307], [149, 302], [125, 313],
    [95, 309], [73, 294], [0, 282]];
  hem.forEach(([px, py], point) => {
    if (point === 0) ctx.moveTo(x + px * scale, y + py * scale);
    else ctx.lineTo(x + px * scale, y + py * scale);
  });
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(entry.image, 0, 0, cellWidth, cellHeight, x, y, width, height);
  ctx.restore();
  return true;
}
