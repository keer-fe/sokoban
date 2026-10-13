import { theme } from './theme.js';

export const HOME_FONT_FILE_ID = 'cloud://cloud1-d5gqpaioo2d8acf27.636c-cloud1-d5gqpaioo2d8acf27-1443887035/fonts/nishiki-teki-2.ttf';

let homeFont = theme.font;

export function loadHomeFont(platform) {
  if (!platform.loadFont) return homeFont;
  if (!platform.resolveCloudFiles) return homeFont;
  platform.resolveCloudFiles({ homeFont: HOME_FONT_FILE_ID })
    .then(({ homeFont: url }) => { homeFont = platform.loadFont(url) || theme.font; })
    .catch((error) => console.warn('Cloud home font failed to resolve.', error));
  return homeFont;
}

export function getHomeFont() { return homeFont; }
