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
  pushCharacter: `${PUBLIC_HOME_ROOT}/push-character-new.png`,
  pushCharacterStep2: `${PUBLIC_HOME_ROOT}/push-character-step2-left.png`,
  pushCrate: `${PUBLIC_HOME_ROOT}/push-crate-new.png`,
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
  pushCharacter: `${CLOUD_HOME_ROOT}/push-character-new.png`,
  pushCharacterStep2: `${CLOUD_HOME_ROOT}/push-character-step2-left.png`,
  pushCrate: `${CLOUD_HOME_ROOT}/push-crate-new.png`,
});

function assignSources(icons, sources) {
  Object.entries(sources).forEach(([name, src]) => {
    if (icons[name]) icons[name].image.src = src;
  });
}

export function loadHomeIcons(ctx, platform) {
  if (!platform.createImage || iconSets.has(ctx)) return;
  const icons = {};
  Object.entries(homeIconSources).forEach(([name, src]) => {
    const image = platform.createImage();
    const entry = { image, ready: false };
    icons[name] = entry;
    image.onload = () => { entry.ready = true; };
    image.onerror = () => { console.warn(`Home icon failed to load: ${name}`); };
  });
  iconSets.set(ctx, icons);
  if (!platform.resolveCloudFiles) {
    assignSources(icons, homeIconSources);
    return;
  }
  platform.resolveCloudFiles(homeIconFileIDs)
    .then((sources) => assignSources(icons, sources))
    .catch((error) => {
      console.warn('Cloud home images failed to resolve.', error);
    });
}

export function drawHomeIcon(ctx, name, x, y, width, height = width) {
  const entry = iconSets.get(ctx)?.[name];
  if (!entry?.ready) return false;
  ctx.drawImage(entry.image, x, y, width, height);
  return true;
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
