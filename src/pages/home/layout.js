import { homeConfig } from './config.js';

export function getHomeLayout(viewport) {
  const top = Math.max(48, viewport.safeTop + 16);
  return {
    top,
    buttons: [...homeConfig.buttons.map((button, index) => ({ ...button,
      x: 24, y: top + 278 + index * 82, width: 366, height: index === 0 ? 70 : 62,
    })), { id: 'signin', label: '签到', x: 24, y: top + 16, width: 80, height: 44, fontSize: 16 },
    { id: 'friends', label: '好友榜', x: 298, y: top + 16, width: 92, height: 44, fontSize: 16 }],
    stats: { x: 90, y: top + 444, width: 234, height: 72 },
    questionsY: viewport.height - viewport.safeBottom - 180,
  };
}
