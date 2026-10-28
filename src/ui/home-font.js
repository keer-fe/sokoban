import { theme } from './theme.js';

export const HOME_FONT_PATH = 'assets/fonts/yuantiSC-Black-ui.ttf';

let homeFont = theme.font;

export function loadHomeFont(platform, onSettled = () => {}) {
  if (!platform.loadFont) {
    onSettled();
    return homeFont;
  }
  const loading = platform.loadFont(HOME_FONT_PATH);
  Promise.resolve(loading)
    .then((family) => { homeFont = family || theme.font; })
    .catch((error) => console.warn('Local home font failed to load.', error))
    .finally(onSettled);
  return homeFont;
}

export function getHomeFont() { return homeFont; }
