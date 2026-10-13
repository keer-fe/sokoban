import { homeConfig } from './config.js';

export function getHomeLayout(viewport) {
  const top = Math.max(48, viewport.safeTop + 16);
  const bottom = viewport.height - viewport.safeBottom;
  const shortcutWidth = 74;
  // Lift the character strip into the previously empty middle of the screen.
  // The floor remains deep enough for the CTA stack on every supported viewport.
  const groundHeight = Math.max(312, Math.min(350, bottom * 0.4));
  return {
    top,
    title: { x: 18, y: top + 2, width: 378, height: 136 },
    groundHeight,
    buttons: [...homeConfig.buttons.map((button, index) => ({ ...button,
      x: index === 0 ? 22 : 54,
      y: index === 0 ? bottom - 250 : bottom - 124,
      width: index === 0 ? 370 : 306,
      height: index === 0 ? 112 : 78,
    })), ...homeConfig.shortcuts.map((shortcut, index) => ({ ...shortcut,
      x: index < 2 ? 8 : 332, y: top + (index === 1 ? 238 : 148),
      width: shortcutWidth, height: 88, fontSize: 14,
    }))],
    cards: { x: 332, y: top + 238, width: shortcutWidth, height: 88 },
  };
}
