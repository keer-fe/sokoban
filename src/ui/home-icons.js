import { cloudUIFileID, publicUISource } from './cloud-assets.js';

const iconSets = new WeakMap();
const CLOUD_BUCKET = '636c-cloud1-d5gqpaioo2d8acf27-1443887035';
const CLOUD_HOME_ROOT = `cloud://cloud1-d5gqpaioo2d8acf27.${CLOUD_BUCKET}/images/home`;
const PUBLIC_HOME_ROOT = `https://${CLOUD_BUCKET}.tcb.qcloud.la/images/home`;
const CLOUD_ANIMATION_ROOT = `cloud://cloud1-d5gqpaioo2d8acf27.${CLOUD_BUCKET}/images/animation`;
const PUBLIC_ANIMATION_ROOT = `https://${CLOUD_BUCKET}.tcb.qcloud.la/images/animation`;
const CLOUD_MODE_ROOT = `cloud://cloud1-d5gqpaioo2d8acf27.${CLOUD_BUCKET}/images/modes`;
const PUBLIC_MODE_ROOT = `https://${CLOUD_BUCKET}.tcb.qcloud.la/images/modes`;

export const localPushAnimationSources = Object.freeze({
  pushCharacterCycle: `${PUBLIC_ANIMATION_ROOT}/push-character-cycle-v2.png`,
  pushCharacterUnderLegForward: `${PUBLIC_ANIMATION_ROOT}/push-character-under-leg-forward.png`,
  pushCrate: `${PUBLIC_ANIMATION_ROOT}/push-crate-new.png`,
});
export const homeBackgroundSource = `${PUBLIC_ANIMATION_ROOT}/push-outdoor-background-v1.png`;
export const levelsBackgroundSource = publicUISource('levels-texture-v2.png');

const campaignIconSources = Object.freeze({
  campaignClassic: `${PUBLIC_MODE_ROOT}/classic-card-v2.jpg`,
  campaignAdventure: `${PUBLIC_MODE_ROOT}/adventure-card-v2.jpg`,
  campaignCoop: `${PUBLIC_MODE_ROOT}/coop-card-v2.jpg`,
  campaignPk: `${PUBLIC_MODE_ROOT}/pk-card-v1.jpg`,
});

const cloudHomeIconSources = Object.freeze({
  settings: `${PUBLIC_HOME_ROOT}/settings.png`,
  friends: `${PUBLIC_HOME_ROOT}/ranking.png`,
  title: `${PUBLIC_HOME_ROOT}/title-xiangbudao8-text-v2.png`,
  startButton: `${PUBLIC_HOME_ROOT}/button-start-game.png`,
  levelsButton: `${PUBLIC_HOME_ROOT}/button-select-levels.png`,
  undoCard: `${PUBLIC_HOME_ROOT}/undo-card.png`,
});

export const homeIconSources = Object.freeze({
  settings: cloudHomeIconSources.settings,
  friends: cloudHomeIconSources.friends,
  title: cloudHomeIconSources.title,
  background: homeBackgroundSource,
  startButton: cloudHomeIconSources.startButton,
  levelsButton: cloudHomeIconSources.levelsButton,
  undoCard: cloudHomeIconSources.undoCard,
  levelsBackground: levelsBackgroundSource,
  starSelected: publicUISource('star-selected-v2.png'),
  starUnselected: publicUISource('star-unselected-v2.png'),
  ...campaignIconSources,
  ...localPushAnimationSources,
  backButton: publicUISource('button-back-wood-v2.png'),
  lock: publicUISource('lock-v1.png'),
});

export const homeIconFileIDs = Object.freeze({
  settings: `${CLOUD_HOME_ROOT}/settings.png`,
  friends: `${CLOUD_HOME_ROOT}/ranking.png`,
  title: `${CLOUD_HOME_ROOT}/title-xiangbudao8-text-v2.png`,
  background: `${CLOUD_ANIMATION_ROOT}/push-outdoor-background-v1.png`,
  startButton: `${CLOUD_HOME_ROOT}/button-start-game.png`,
  levelsButton: `${CLOUD_HOME_ROOT}/button-select-levels.png`,
  undoCard: `${CLOUD_HOME_ROOT}/undo-card.png`,
  levelsBackground: cloudUIFileID('levels-texture-v2.png'),
  starSelected: cloudUIFileID('star-selected-v2.png'),
  starUnselected: cloudUIFileID('star-unselected-v2.png'),
  backButton: cloudUIFileID('button-back-wood-v2.png'),
  lock: cloudUIFileID('lock-v1.png'),
  campaignClassic: `${CLOUD_MODE_ROOT}/classic-card-v2.jpg`,
  campaignAdventure: `${CLOUD_MODE_ROOT}/adventure-card-v2.jpg`,
  campaignCoop: `${CLOUD_MODE_ROOT}/coop-card-v2.jpg`,
  campaignPk: `${CLOUD_MODE_ROOT}/pk-card-v1.jpg`,
  pushCharacterCycle: `${CLOUD_ANIMATION_ROOT}/push-character-cycle-v2.png`,
  pushCharacterUnderLegForward: `${CLOUD_ANIMATION_ROOT}/push-character-under-leg-forward.png`,
  pushCrate: `${CLOUD_ANIMATION_ROOT}/push-crate-new.png`,
});

function assignSources(icons, sources) {
  Object.entries(sources).forEach(([name, src]) => {
    if (icons[name]) icons[name].image.src = src;
  });
}

export function loadHomeIcons(ctx, platform, onCloudProgress = () => {}) {
  if (!platform.createImage || iconSets.has(ctx)) return;
  const icons = {};
  Object.entries(homeIconSources).forEach(([name, src]) => {
    const image = platform.createImage();
    const entry = { image, ready: false, settled: false };
    icons[name] = entry;
    const settle = (ready) => {
      if (entry.settled) return;
      entry.settled = true;
      entry.ready = ready;
      if (name in homeIconFileIDs) onCloudProgress(name);
    };
    image.onload = () => settle(true);
    image.onerror = () => {
      settle(false);
      console.warn(`Home icon failed to load: ${name}`);
    };
  });
  iconSets.set(ctx, icons);
  if (!platform.resolveCloudFiles) {
    assignSources(icons, { ...cloudHomeIconSources, ...localPushAnimationSources, background: homeBackgroundSource,
      levelsBackground: levelsBackgroundSource, backButton: homeIconSources.backButton,
      starSelected: homeIconSources.starSelected, starUnselected: homeIconSources.starUnselected,
      lock: homeIconSources.lock, ...campaignIconSources });
    return;
  }
  platform.resolveCloudFiles(homeIconFileIDs)
    .then((sources) => assignSources(icons, sources))
    .catch((error) => {
      Object.keys(homeIconFileIDs).forEach((name) => {
        const entry = icons[name];
        if (!entry.settled) {
          entry.settled = true;
          onCloudProgress(name);
        }
      });
      console.warn('Cloud home images failed to resolve.', error);
      assignSources(icons, { ...cloudHomeIconSources, ...localPushAnimationSources, background: homeBackgroundSource,
        levelsBackground: levelsBackgroundSource, backButton: homeIconSources.backButton,
        starSelected: homeIconSources.starSelected, starUnselected: homeIconSources.starUnselected,
        lock: homeIconSources.lock, ...campaignIconSources });
    });
}

export function drawHomeIcon(ctx, name, x, y, width, height = width) {
  const entry = iconSets.get(ctx)?.[name];
  if (!entry?.ready) return false;
  ctx.drawImage(entry.image, x, y, width, height);
  return true;
}

export function drawHomeSpriteFrame(ctx, name, frame, frameCount, x, y, width, height = width) {
  const entry = iconSets.get(ctx)?.[name];
  if (!entry?.ready) return false;
  const sourceWidth = entry.image.width / frameCount;
  ctx.drawImage(entry.image, frame * sourceWidth, 0, sourceWidth, entry.image.height,
    x, y, width, height);
  return true;
}

// Crop transparent padding without stretching the visible artwork.
export function drawHomeRegion(ctx, name, source, x, y, width, height) {
  const entry = iconSets.get(ctx)?.[name];
  if (!entry?.ready) return false;
  ctx.drawImage(entry.image, ...source, x, y, width, height);
  return true;
}

export function getHomeGroundBaseline(ctx, width, height) {
  // The outdoor backdrop is vertically cropped so its wooden path starts here.
  return height * 0.65;
}

export function drawHomeBackground(ctx, x, y, width, height, elapsed = 0) {
  const entry = iconSets.get(ctx)?.background;
  if (!entry?.ready) return false;
  const sourceY = entry.image.height * 0.23;
  const sourceHeight = entry.image.height - sourceY;
  const tileWidth = entry.image.width / sourceHeight * height;
  if (!Number.isFinite(tileWidth) || tileWidth <= 0) return false;
  const distance = elapsed * 32 + tileWidth * 0.12;
  const tileIndex = Math.floor(distance / tileWidth);
  const offset = distance % tileWidth;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  for (let left = x - offset, index = tileIndex; left < x + width; left += tileWidth, index += 1) {
    if (index % 2 === 0) ctx.drawImage(entry.image,
      0, sourceY, entry.image.width, sourceHeight, left, y, tileWidth, height);
    else {
      ctx.save();
      ctx.translate(left + tileWidth, y);
      ctx.scale(-1, 1);
      ctx.drawImage(entry.image,
        0, sourceY, entry.image.width, sourceHeight, 0, 0, tileWidth, height);
      ctx.restore();
    }
  }
  ctx.restore();
  return true;
}

export function drawLevelsBackground(ctx, x, y, width, height, frosted = false) {
  const entry = iconSets.get(ctx)?.levelsBackground;
  if (!entry?.ready || !entry.image.width || !entry.image.height) return false;
  const sourceRatio = entry.image.width / entry.image.height;
  const targetRatio = width / height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = entry.image.width;
  let sourceHeight = entry.image.height;
  if (sourceRatio > targetRatio) {
    sourceWidth = entry.image.height * targetRatio;
    sourceX = (entry.image.width - sourceWidth) / 2;
  } else {
    sourceHeight = entry.image.width / targetRatio;
    sourceY = (entry.image.height - sourceHeight) / 2;
  }
  ctx.save();
  if (frosted && typeof ctx.filter === 'string') {
    ctx.filter = 'blur(9px)';
    ctx.drawImage(entry.image, sourceX, sourceY, sourceWidth, sourceHeight,
      x - 16, y - 16, width + 32, height + 32);
  } else {
    ctx.drawImage(entry.image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
    // Older WeChat canvases lack filter; soften the image with translucent offset samples.
    if (frosted) {
      ctx.globalAlpha = 0.16;
      for (const [dx, dy] of [[-5, 0], [5, 0], [0, -5], [0, 5], [-3, -3], [3, 3]]) {
        ctx.drawImage(entry.image, sourceX, sourceY, sourceWidth, sourceHeight,
          x - 8 + dx, y - 8 + dy, width + 16, height + 16);
      }
    }
  }
  ctx.restore();
  return true;
}
