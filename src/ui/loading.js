import { panel, text } from './draw.js';
import { theme } from './theme.js';
import { drawLoadingPushAnimation } from '../pages/home/push-animation.js';

export function drawLoading(ctx, viewport, elapsed, progress) {
  const { width, height, safeBottom } = viewport;
  ctx.fillStyle = theme.sky;
  ctx.fillRect(0, 0, width, height);

  drawLoadingPushAnimation(ctx, width / 2, height / 2 + 28, elapsed);

  const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  const barWidth = Math.min(300, width - 64);
  const barHeight = 18;
  const barX = (width - barWidth) / 2;
  const barY = height - safeBottom - 74;
  text(ctx, `资源加载中 ${percent}%`, width / 2, barY - 22,
    { size: 16, color: '#FFF4C7', outline: 3 });
  panel(ctx, barX, barY, barWidth, barHeight,
    { fill: 'rgba(24, 51, 94, 0.72)', stroke: '#FFF4C7', lineWidth: 3, radius: 9, offset: 0 });
  if (percent > 0) {
    panel(ctx, barX + 4, barY + 4, (barWidth - 8) * percent / 100, barHeight - 8,
      { fill: theme.yellow, stroke: theme.yellow, lineWidth: 0, radius: 5, offset: 0 });
  }
}
