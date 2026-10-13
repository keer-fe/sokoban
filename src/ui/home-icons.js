const iconSets = new WeakMap();
const CLOUD_BUCKET = '636c-cloud1-d5gqpaioo2d8acf27-1443887035';
const CLOUD_HOME_ROOT = `cloud://cloud1-d5gqpaioo2d8acf27.${CLOUD_BUCKET}/images/home`;
const PUBLIC_HOME_ROOT = `https://${CLOUD_BUCKET}.tcb.qcloud.la/images/home`;

export const homeIconSources = Object.freeze({
  settings: `${PUBLIC_HOME_ROOT}/settings.png`,
  signin: `${PUBLIC_HOME_ROOT}/signin.png`,
  friends: `${PUBLIC_HOME_ROOT}/ranking.png`,
  title: `${PUBLIC_HOME_ROOT}/title-xiangbudao8-text-v2.png`,
  background: `${PUBLIC_HOME_ROOT}/home-background-v2.png`,
  startButton: `${PUBLIC_HOME_ROOT}/button-start-game.png`,
  levelsButton: `${PUBLIC_HOME_ROOT}/button-select-levels.png`,
  undoCard: `${PUBLIC_HOME_ROOT}/undo-card.png`,
  pushCharacterCycle: 'assets/animation/push-character-cycle-v2.png',
  pushCharacterUnderLegForward: 'assets/animation/push-character-under-leg-forward.png',
  pushCrate: 'assets/animation/push-crate-new.png',
});

export const homeIconFileIDs = Object.freeze({
  settings: `${CLOUD_HOME_ROOT}/settings.png`,
  signin: `${CLOUD_HOME_ROOT}/signin.png`,
  friends: `${CLOUD_HOME_ROOT}/ranking.png`,
  title: `${CLOUD_HOME_ROOT}/title-xiangbudao8-text-v2.png`,
  background: `${CLOUD_HOME_ROOT}/home-background-v2.png`,
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
  if (!platform.resolveCloudFiles) {
    assignSources(icons, homeIconSources);
    return;
  }
  assignSources(icons, Object.fromEntries(Object.entries(homeIconSources)
    .filter(([name]) => !(name in homeIconFileIDs))));
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
  const image = iconSets.get(ctx)?.background?.image;
  const sourceWidth = image?.width || 941;
  const sourceHeight = image?.height || 1672;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  // Top of the wooden floor in home-background-v2, using the same cover crop.
  return (sourceHeight * 0.642 - (sourceHeight - height / scale) / 2) * scale;
}

export function drawHomeBackground(ctx, x, y, width, height) {
  const entry = iconSets.get(ctx)?.background;
  if (!entry?.ready) return false;
  const sourceWidth = entry.image.width || 941;
  const sourceHeight = entry.image.height || 1672;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  const sourceX = (sourceWidth - cropWidth) / 2;
  const sourceY = (sourceHeight - cropHeight) / 2;
  ctx.drawImage(entry.image, sourceX, sourceY, cropWidth, cropHeight, x, y, width, height);
  return true;
}
