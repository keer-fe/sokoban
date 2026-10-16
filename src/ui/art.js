// One image per canvas context, shared by the board and decorative illustrations.
const atlases = new WeakMap();
const CLOUD_BUCKET = '636c-cloud1-d5gqpaioo2d8acf27-1443887035';
export const artFileID = `cloud://cloud1-d5gqpaioo2d8acf27.${CLOUD_BUCKET}/images/generated/sokoban-style-sprite-sheet-v2.png`;
export const artSource = `https://${CLOUD_BUCKET}.tcb.qcloud.la/images/generated/sokoban-style-sprite-sheet-v2.png`;
export const characterSources = Object.freeze({
  walk: 'assets/generated/map-v2/character-walk-4dir-3frame.png',
  push: 'assets/generated/map-v2/character-push-4dir-3frame.png',
});
export const sprites = {
  crate: [0, 3], done: [1, 3], target: [2, 3], wall: [3, 3],
};
const directionColumns = Object.freeze({ down: 0, up: 1, left: 2, right: 3 });

export function loadArt(ctx, platform) {
  if (!platform.createImage || atlases.has(ctx)) return;
  const image = platform.createImage();
  const atlas = { image, ready: false, characters: {} };
  atlases.set(ctx, atlas);
  image.onload = () => { atlas.ready = true; };
  image.onerror = () => {
    atlas.ready = false;
    if (image.src !== artSource) image.src = artSource;
    else console.warn('Sokoban artwork failed to load; using vector fallback.');
  };
  if (platform.resolveCloudFiles) {
    platform.resolveCloudFiles({ art: artFileID })
      .then(({ art }) => { image.src = art; })
      .catch(() => { image.src = artSource; });
  } else image.src = artSource;
  Object.entries(characterSources).forEach(([kind, source]) => {
    const character = platform.createImage();
    const entry = { image: character, ready: false };
    atlas.characters[kind] = entry;
    character.onload = () => { entry.ready = true; };
    character.onerror = () => {
      entry.ready = false;
      console.warn(`Character ${kind} artwork failed to load; using vector fallback.`);
    };
    character.src = source;
  });
}

export function drawArt(ctx, name, x, y, width, height = width) {
  const atlas = atlases.get(ctx);
  if (!atlas || !atlas.ready || !(name in sprites)) return false;
  const [column, row] = sprites[name];
  const cellWidth = atlas.image.width / 4;
  const cellHeight = atlas.image.height / 4;
  if (!Number.isFinite(cellWidth) || !Number.isFinite(cellHeight) || !cellWidth || !cellHeight) return false;
  ctx.drawImage(atlas.image, column * cellWidth, row * cellHeight, cellWidth, cellHeight,
    x, y, width, height);
  return true;
}

export function drawCharacterFrame(ctx, facing, kind, frame, x, y, width, height = width) {
  const atlas = atlases.get(ctx);
  const entry = atlas?.characters[kind] || atlas?.characters.walk;
  const column = directionColumns[facing];
  if (!entry?.ready || column === undefined) return false;
  const cellWidth = entry.image.width / 4;
  const cellHeight = entry.image.height / 3;
  if (!Number.isFinite(cellWidth) || !Number.isFinite(cellHeight) || !cellWidth || !cellHeight) return false;
  const row = Math.max(0, Math.min(2, Number.isFinite(frame) ? Math.floor(frame) : 1));
  ctx.drawImage(entry.image, column * cellWidth, row * cellHeight, cellWidth, cellHeight,
    x, y, width, height);
  return true;
}
