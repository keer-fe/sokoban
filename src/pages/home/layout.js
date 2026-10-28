import { homeConfig } from './config.js';

export function getHomeLayout(viewport) {
  const top = Math.max(48, viewport.safeTop + 6);
  const bottom = viewport.height - viewport.safeBottom;
  const title = { x: 37, y: top, width: 340, height: 150 };
  const sceneY = title.y + title.height + 2;
  const startY = bottom - 266;
  const sceneHeight = Math.max(205, Math.min(335, startY - sceneY - 16));
  const scene = { x: -15, y: sceneY, width: 445, height: sceneHeight };
  const toolsY = scene.y + 24;
  return {
    top,
    title,
    scene,
    buttons: [...homeConfig.buttons.map((button) => ({ ...button,
      ...(button.id === 'start' ? { x: 49, y: startY, width: 316, height: 100 }
        : button.id === 'levels' ? { x: 18, y: bottom - 150, width: 185, height: 78 }
          : { x: 211, y: bottom - 150, width: 185, height: 78 }),
    })), ...homeConfig.shortcuts.map((shortcut) => ({ ...shortcut,
      x: shortcut.id === 'settings' ? 12 : 346,
      y: toolsY, width: 56, height: 56,
      nativeIconSize: shortcut.native ? 56 : undefined,
    }))],
  };
}
