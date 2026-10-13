// One image per canvas context, shared by the board and decorative illustrations.
const atlases = new WeakMap();
export const sprites = { wall: 0, floor: 1, crate: 2, done: 3, target: 4, player: 5, targetFrame: 6,
  playerUp: 7, playerLeft: 8, playerRight: 9, playerRightStep1: 10, playerRightStep2: 11 };
export const playerSprites = { down: 'player', up: 'playerUp', left: 'playerLeft', right: 'playerRight' };

export function loadArt(ctx, platform) {
  if (!platform.createImage || atlases.has(ctx)) return;
  const image = platform.createImage();
  const atlas = { image, ready: false };
  atlases.set(ctx, atlas);
  image.onload = () => { atlas.ready = true; };
  image.onerror = () => { console.warn('Sokoban artwork failed to load; using vector fallback.'); };
  image.src = 'assets/sokoban.png';
}

export function drawArt(ctx, name, x, y, width, height = width) {
  const atlas = atlases.get(ctx);
  if (!atlas || !atlas.ready || !(name in sprites)) return false;
  ctx.drawImage(atlas.image, sprites[name] * 192, 0, 192, 192, x, y, width, height);
  return true;
}
