import { homeConfig } from './config.js';
import { getHomeLayout } from './layout.js';
import { theme } from '../../ui/theme.js';
import { panel, text } from '../../ui/draw.js';
import { cloud, ground, illustration, logo } from '../../ui/illustrations.js';
import { ButtonInput, drawButton } from '../../ui/button.js';

export class HomePage {
  constructor({ onAction }) {
    this.layout = null;
    this.input = new ButtonInput(() => this.layout ? this.layout.buttons : [], onAction);
  }

  resize(viewport) {
    this.viewport = viewport;
    this.layout = getHomeLayout(viewport);
    this.input.reset();
  }

  render(ctx, elapsed) {
    const { width, height, safeBottom } = this.viewport;
    const { top, buttons, stats, questionsY } = this.layout;
    const drift = (period) => 10 * (1 - Math.cos(elapsed / period * Math.PI * 2));
    const bob = (phase = 0) => -4 * (1 - Math.cos(elapsed * Math.PI * 2 + phase));

    cloud(ctx, width - 122 + drift(16), height * 0.025, 96);
    cloud(ctx, 16 + drift(20), height * 0.11, 74);
    cloud(ctx, width - 112 + drift(24), height * 0.18, 62);
    const decorations = [
      ['question', 16, height * 0.14, 32],
      ['star', 360, height * 0.22, 28],
      ['question', 29, height * 0.40, 26],
      ['crate', 361, height * 0.48, 30],
      ['star', 108, height * 0.15, 26],
      ['star', 20, height * 0.60, 22],
    ];
    decorations.forEach(([kind, x, y, size], i) => {
      illustration(ctx, kind, x, y + bob(i), size,
        { rotation: Math.sin(elapsed * 1.6 + i) * 0.12 });
    });
    ground(ctx, width, height, safeBottom);
    [135, 187, 239].forEach((x) => illustration(ctx, 'question', x, questionsY, 40, { shadow: true }));

    logo(ctx, 157, top);
    text(ctx, homeConfig.title, 207, top + 146,
      { size: 40, spacing: 4, color: theme.green, outline: 3 });
    text(ctx, homeConfig.subtitle, 207, top + 190,
      { size: 14, spacing: 6, color: theme.white, outline: 2 });
    ['crate', 'done', 'target'].forEach((kind, i) =>
      illustration(ctx, kind, 127 + i * 58, top + 218 + (i < 2 ? bob(i * 1.25) : 0), 44));
    buttons.forEach((button) => drawButton(ctx, button, this.input.activeId === button.id));
    panel(ctx, stats.x, stats.y, stats.width, stats.height,
      { fill: theme.brick, lineWidth: 4, radius: 8, shadow: theme.ink });
    homeConfig.stats.forEach((stat, i) => {
      const cellWidth = stats.width / homeConfig.stats.length;
      const center = stats.x + cellWidth * (i + 0.5);
      if (i) {
        ctx.fillStyle = theme.ink;
        ctx.fillRect(stats.x + cellWidth * i - 2, stats.y, 4, stats.height);
      }
      text(ctx, stat.value, center, stats.y + 26, { size: 24, color: theme.yellow, outline: 1 });
      text(ctx, stat.label, center, stats.y + 52, { size: 11, color: theme.white, spacing: 1 });
    });
  }

  handlePointer(type, point) { this.input.handle(type, point); }
  pause() { this.input.reset(); }
}
