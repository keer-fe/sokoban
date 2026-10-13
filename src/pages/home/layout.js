import { homeConfig } from './config.js';

export function getHomeLayout(viewport) {
  const top = Math.max(48, viewport.safeTop + 16);
  const bottom = viewport.height - viewport.safeBottom;
  const shortcutWidth = 74;
  const groundHeight = Math.max(260, Math.min(290, bottom * 0.32));
  return {
    top,
    title: { x: 18, y: top + 2, width: 378, height: 136 },
    groundHeight,
    buttons: [...homeConfig.buttons.map((button, index) => ({ ...button,
      x: 32, y: index === 0 ? bottom - 246 : bottom - 140,
      width: 350, height: index === 0 ? 102 : 96,
    })), ...homeConfig.shortcuts.map((shortcut, index) => ({ ...shortcut,
      x: index < 2 ? 8 : 332, y: top + (index === 1 ? 244 : 150),
      width: shortcutWidth, height: 88, fontSize: 14,
    }))],
    cards: { x: 332, y: top + 244, width: shortcutWidth, height: 88 },
  };
}
