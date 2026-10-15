import { theme } from './theme.js';

export const HOME_FONT_FILE_ID = 'cloud://cloud1-d5gqpaioo2d8acf27.636c-cloud1-d5gqpaioo2d8acf27-1443887035/fonts/YuWoErYanNiZuiKeAi-2.ttf';

let homeFont = theme.font;

export function loadHomeFont(platform, onSettled = () => {}) {
  if (!platform.loadFont) {
    onSettled();
    return homeFont;
  }
  const loading = platform.loadCloudFont
    ? platform.loadCloudFont(HOME_FONT_FILE_ID)
    : platform.resolveCloudFiles
      ? platform.resolveCloudFiles({ homeFont: HOME_FONT_FILE_ID })
        .then(({ homeFont: url }) => platform.loadFont(url))
      : Promise.resolve(theme.font);
  Promise.resolve(loading)
    .then((family) => { homeFont = family || theme.font; })
    .catch((error) => console.warn('Cloud home font failed to load.', error))
    .finally(onSettled);
  return homeFont;
}

export function getHomeFont() { return homeFont; }
