const iconSets = new WeakMap();
const CLOUD_BUCKET = '636c-cloud1-d5gqpaioo2d8acf27-1443887035';
const CLOUD_HOME_ROOT = `cloud://cloud1-d5gqpaioo2d8acf27.${CLOUD_BUCKET}/images/home`;
const PUBLIC_HOME_ROOT = `https://${CLOUD_BUCKET}.tcb.qcloud.la/images/home`;
const CLOUD_ANIMATION_ROOT = `cloud://cloud1-d5gqpaioo2d8acf27.${CLOUD_BUCKET}/images/animation`;
const PUBLIC_ANIMATION_ROOT = `https://${CLOUD_BUCKET}.tcb.qcloud.la/images/animation`;

// The loading character must be available before any cloud request completes.
// Keep these files in the mini-game package instead of the cloud image manifest.
export const localPushAnimationSources = Object.freeze({
  pushCharacterCycle: 'assets/animation/push-character-cycle-v2.png',
  pushCharacterUnderLegForward: 'assets/animation/push-character-under-leg-forward.png',
  pushCrate: 'assets/animation/push-crate-new.png',
});
export const homeBackgroundSource = `${PUBLIC_ANIMATION_ROOT}/push-outdoor-background-v1.png`;

const cloudHomeIconSources = Object.freeze({
  settings: `${PUBLIC_HOME_ROOT}/settings.png`,
  signin: `${PUBLIC_HOME_ROOT}/signin.png`,
  friends: `${PUBLIC_HOME_ROOT}/ranking.png`,
  title: `${PUBLIC_HOME_ROOT}/title-xiangbudao8-text-v2.png`,
  startButton: `${PUBLIC_HOME_ROOT}/button-start-game.png`,
  levelsButton: `${PUBLIC_HOME_ROOT}/button-select-levels.png`,
  undoCard: `${PUBLIC_HOME_ROOT}/undo-card.png`,
});

export const homeIconSources = Object.freeze({
  settings: cloudHomeIconSources.settings,
  signin: cloudHomeIconSources.signin,
  friends: cloudHomeIconSources.friends,
  title: cloudHomeIconSources.title,
  background: homeBackgroundSource,
  startButton: cloudHomeIconSources.startButton,
  levelsButton: cloudHomeIconSources.levelsButton,
  undoCard: cloudHomeIconSources.undoCard,
  ...localPushAnimationSources,
});

export const homeIconFileIDs = Object.freeze({
  settings: `${CLOUD_HOME_ROOT}/settings.png`,
  signin: `${CLOUD_HOME_ROOT}/signin.png`,
  friends: `${CLOUD_HOME_ROOT}/ranking.png`,
  title: `${CLOUD_HOME_ROOT}/title-xiangbudao8-text-v2.png`,
  background: `${CLOUD_ANIMATION_ROOT}/push-outdoor-background-v1.png`,
  startButton: `${CLOUD_HOME_ROOT}/button-start-game.png`,
  levelsButton: `${CLOUD_HOME_ROOT}/button-select-levels.png`,
  undoCard: `${CLOUD_HOME_ROOT}/undo-card.png`,
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
  assignSources(icons, localPushAnimationSources);
  if (!platform.resolveCloudFiles) {
    assignSources(icons, { ...cloudHomeIconSources, background: homeBackgroundSource });
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
