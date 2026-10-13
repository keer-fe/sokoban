import { homeConfig } from './config.js';
import { getHomeLayout } from './layout.js';
import { theme } from '../../ui/theme.js';
import { text } from '../../ui/draw.js';
import { illustration } from '../../ui/illustrations.js';
import { ButtonInput, drawButton } from '../../ui/button.js';
import { drawHomeBackground, drawHomeIcon } from '../../ui/home-icons.js';
import { getHomeFont } from '../../ui/home-font.js';
import { drawPushAnimation } from './push-animation.js';

export class HomePage {
  constructor({ onAction, controller }) {
    this.controller = controller;
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
    const { buttons, cards, groundHeight, title } = this.layout;
    if (!drawHomeBackground(ctx, 0, 0, width, height)) {
      ctx.fillStyle = theme.sky;
      ctx.fillRect(0, 0, width, height);
    }
    drawPushAnimation(ctx, width, height - safeBottom - groundHeight + 2, elapsed);

    const beat = Math.pow(Math.max(0, Math.sin(elapsed * Math.PI * 2 / (60 / 104))), 6);
    ctx.save();
    ctx.translate(title.x + title.width / 2, title.y + title.height / 2 - beat * 10);
    ctx.scale(1 + beat * 0.10, 1 + beat * 0.14);
    if (!drawHomeIcon(ctx, 'title', -title.width / 2, -title.height / 2, title.width, title.height)) {
      text(ctx, homeConfig.title, 0, 0,
        { size: 44, spacing: 4, color: theme.yellow, outline: 5 });
    }
    ctx.restore();
    buttons.forEach((button) => {
      const pressed = this.input.activeId === button.id;
      if (button.art) {
        const shift = pressed ? 4 : 0;
        if (drawHomeIcon(ctx, button.art, button.x + shift, button.y + shift, button.width, button.height)) return;
        drawButton(ctx, button, pressed);
        return;
      }
      if (!button.icon) { drawButton(ctx, button, pressed); return; }
      const shift = pressed ? 3 : 0;
      ctx.save();
      ctx.translate(shift, shift);
      if (!drawHomeIcon(ctx, button.icon, button.x + 5, button.y, 64)) {
        illustration(ctx, button.id === 'friends' ? 'star' : button.id === 'signin' ? 'done' : 'question',
          button.x + 11, button.y + 4, 52);
      }
      text(ctx, button.label, button.x + button.width / 2, button.y + 73,
        { size: button.fontSize, color: '#FFF4C7', outline: 3, font: getHomeFont() });
      ctx.restore();
    });
    const cardCount = this.controller ? this.controller.progress.state.cards : 0;
    if (!drawHomeIcon(ctx, 'undoCard', cards.x + 5, cards.y, 64)) {
      illustration(ctx, 'question', cards.x + 11, cards.y + 4, 52);
    }
    text(ctx, `撤销卡 ×${cardCount}`, cards.x + cards.width / 2, cards.y + 73,
      { size: 14, color: '#FFF4C7', outline: 3, font: getHomeFont() });
  }

  handlePointer(type, point) { this.input.handle(type, point); }
  pause() { this.input.reset(); }
}
