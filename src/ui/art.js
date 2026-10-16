import { cloudImageFileID, publicImageSource } from './cloud-assets.js';

// One image per canvas context, shared by the board and decorative illustrations.
const atlases = new WeakMap();
export const artSource = publicImageSource('generated/map-v2/map-tiles-4x4.png');
export const artFileID = cloudImageFileID('generated/map-v2/map-tiles-4x4.png');
export const environmentSources = Object.freeze({
  outerWall: publicImageSource('generated/outer-wall-rounded-green-v3.png'),
  crate: publicImageSource('generated/map-v6/home-map-sprites-v2.png'),
  goal: publicImageSource('generated/map-v4/goal-home-style-v1.png'),
  buttonOff: publicImageSource('generated/map-v4/button-off-home-style-v1.png'),
  buttonOn: publicImageSource('generated/map-v4/button-on-home-style-v1.png'),
  doorClosed: publicImageSource('generated/map-v4/door-closed-home-style-v1.png'),
  doorOpen: publicImageSource('generated/map-v4/door-open-home-style-v1.png'),
});
export const characterSources = Object.freeze({
  walk: publicImageSource('generated/map-v2/character-walk-4dir-3frame.png'),
  push: publicImageSource('generated/map-v2/character-push-4dir-3frame.png'),
});
export const artFileIDs = Object.freeze({
  art: artFileID,
  ...Object.fromEntries(Object.keys(environmentSources)
    .map((name) => [name, cloudImageFileID({ outerWall: 'generated/outer-wall-rounded-green-v3.png', crate: 'generated/map-v6/home-map-sprites-v2.png', goal: 'generated/map-v4/goal-home-style-v1.png', buttonOff: 'generated/map-v4/button-off-home-style-v1.png', buttonOn: 'generated/map-v4/button-on-home-style-v1.png', doorClosed: 'generated/map-v4/door-closed-home-style-v1.png', doorOpen: 'generated/map-v4/door-open-home-style-v1.png' }[name])])),
  walk: cloudImageFileID('generated/map-v2/character-walk-4dir-3frame.png'),
  push: cloudImageFileID('generated/map-v2/character-push-4dir-3frame.png'),
});
export const sprites = {
  crate: [51, 67, 268, 258], done: [326, 56, 307, 269],
  target: [648, 66, 266, 260], floor: [941, 67, 261, 261],
  mossWall: [50, 348, 269, 263], wall: [348, 347, 267, 264],
  crackedWall: [645, 347, 270, 264], cornerWall: [939, 348, 265, 265],
  button: [50, 633, 269, 257], buttonPressed: [349, 633, 266, 257],
  door: [643, 633, 271, 256], doorOpen: [940, 633, 266, 256],
  rubble: [50, 911, 268, 269], grass: [343, 910, 277, 273],
  playerShadow: [643, 912, 271, 268], crateShadow: [939, 912, 264, 268],
};
const directionColumns = Object.freeze({ down: 0, up: 1, left: 2, right: 3 });
const characterFrames = Object.freeze({
  walk: [
    [[56, 62, 219, 355], [362, 59, 215, 357], [646, 66, 244, 350], [967, 67, 250, 349]],
    [[56, 442, 222, 357], [362, 440, 215, 360], [647, 449, 243, 348], [967, 450, 246, 344]],
    [[56, 823, 222, 360], [361, 820, 218, 360], [646, 828, 242, 350], [968, 831, 245, 346]],
  ],
  push: [
    [[50, 55, 220, 363], [359, 54, 218, 359], [634, 60, 256, 357], [956, 60, 263, 358]],
    [[50, 449, 219, 349], [359, 449, 217, 348], [636, 455, 260, 342], [952, 454, 261, 344]],
    [[50, 823, 224, 364], [359, 821, 218, 366], [635, 834, 261, 359], [953, 834, 264, 361]],
  ],
});

export function loadArt(ctx, platform) {
  if (!platform.createImage || atlases.has(ctx)) return;
  const image = platform.createImage();
  const atlas = { image, ready: false, characters: {}, environment: {} };
  atlases.set(ctx, atlas);
  image.onload = () => { atlas.ready = true; };
  image.onerror = () => {
    atlas.ready = false;
    console.warn('Sokoban artwork failed to load; using vector fallback.');
  };
  image.src = artSource;
  Object.entries(environmentSources).forEach(([name, source]) => {
    const asset = platform.createImage();
    const entry = { image: asset, ready: false };
    atlas.environment[name] = entry;
    asset.onload = () => { entry.ready = true; };
    asset.onerror = () => {
      entry.ready = false;
      console.warn(`Environment ${name} artwork failed to load.`);
    };
    asset.src = source;
  });
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
  if (platform.resolveCloudFiles) {
    platform.resolveCloudFiles(artFileIDs).then((sources) => {
      image.src = sources.art;
      Object.entries(atlas.environment).forEach(([name, entry]) => { entry.image.src = sources[name]; });
      Object.entries(atlas.characters).forEach(([name, entry]) => { entry.image.src = sources[name]; });
    }).catch((error) => console.warn('Cloud map artwork failed to resolve.', error));
  }
}

export function drawArt(ctx, name, x, y, width, height = width) {
  const atlas = atlases.get(ctx);
  if (!atlas || !atlas.ready || !(name in sprites)) return false;
  const [sourceX, sourceY, sourceWidth, sourceHeight] = sprites[name];
  const scale = Math.min(width / sourceWidth, height / sourceHeight) * 0.96;
  const drawnWidth = sourceWidth * scale;
  const drawnHeight = sourceHeight * scale;
  ctx.drawImage(atlas.image, sourceX, sourceY, sourceWidth, sourceHeight,
    x + (width - drawnWidth) / 2, y + (height - drawnHeight) / 2, drawnWidth, drawnHeight);
  return true;
}

export function drawEnvironment(ctx, name, x, y, width, height = width) {
  const entry = atlases.get(ctx)?.environment[name];
  if (!entry?.ready) return false;
  ctx.drawImage(entry.image, x, y, width, height);
  return true;
}

export function drawCrate(ctx, x, y, size) {
  // Crop to the visible crate instead of the sprite cell's asymmetric transparent padding.
  return drawEnvironmentSprite(ctx, 'crate', [41, 928, 271, 270], x, y, size, 0.8, 0.9);
}

export function drawGoal(ctx, x, y, size) {
  return drawEnvironmentSprite(ctx, 'goal', [43, 42, 425, 426], x, y, size, 0.72, 0.86);
}

export function drawWall(ctx, x, y, size) {
  const entry = atlases.get(ctx)?.environment.outerWall;
  if (!entry?.ready) return false;
  const inset = size * 0.015;
  // Crop the large transparent margin baked into the generated wall artwork.
  ctx.drawImage(entry.image, 126, 140, 1002, 980,
    x + inset, y + inset, size - inset * 2, size - inset * 2);
  return true;
}

export function drawPressurePlate(ctx, pressed, x, y, size) {
  return pressed
    ? drawEnvironmentSprite(ctx, 'buttonOn', [38, 43, 436, 425], x, y, size, 0.82, 0.91)
    : drawEnvironmentSprite(ctx, 'buttonOff', [45, 54, 423, 404], x, y, size, 0.82, 0.91);
}

export function drawGate(ctx, open, x, y, size) {
  return open
    ? drawEnvironmentSprite(ctx, 'doorOpen', [12, 69, 488, 366], x, y, size, 0.86, 0.92)
    : drawEnvironmentSprite(ctx, 'doorClosed', [31, 37, 450, 425], x, y, size, 0.9, 0.95);
}

function drawEnvironmentSprite(ctx, name, source, x, y, size, visibleScale, baseline) {
  const entry = atlases.get(ctx)?.environment[name];
  if (!entry?.ready) return false;
  const [sourceX, sourceY, sourceWidth, sourceHeight] = source;
  const drawnHeight = size * visibleScale;
  const drawnWidth = drawnHeight * sourceWidth / sourceHeight;
  ctx.drawImage(entry.image, sourceX, sourceY, sourceWidth, sourceHeight,
    x + (size - drawnWidth) / 2, y + size * baseline - drawnHeight, drawnWidth, drawnHeight);
  return true;
}

export function drawCharacterFrame(ctx, facing, kind, frame, x, y, width, height = width) {
  const atlas = atlases.get(ctx);
  const entry = atlas?.characters[kind] || atlas?.characters.walk;
  const column = directionColumns[facing];
  if (!entry?.ready || column === undefined) return false;
  const row = Math.max(0, Math.min(2, Number.isFinite(frame) ? Math.floor(frame) : 1));
  const [sourceX, sourceY, sourceWidth, sourceHeight] =
    (characterFrames[kind] || characterFrames.walk)[row][column];
  const drawnHeight = height * 0.88;
  const drawnWidth = drawnHeight * sourceWidth / sourceHeight;
  const drawnX = x + (width - drawnWidth) / 2;
  const drawnY = y + height * 0.96 - drawnHeight;
  ctx.drawImage(entry.image, sourceX, sourceY, sourceWidth, sourceHeight,
    drawnX, drawnY, drawnWidth, drawnHeight);
  return true;
}
