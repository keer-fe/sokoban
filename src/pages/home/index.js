import { homeConfig } from './config.js';
import { getHomeLayout } from './layout.js';
import { theme } from '../../ui/theme.js';
import { text } from '../../ui/draw.js';
import { illustration } from '../../ui/illustrations.js';
import { ButtonInput, drawButton } from '../../ui/button.js';
import { drawHomeBackground, drawHomeIcon, getHomeGroundBaseline } from '../../ui/home-icons.js';
import { getHomeFont } from '../../ui/home-font.js';
import { drawPushAnimation } from './push-animation.js';
import { drawHomeVisual, drawHomeWalkFrame, homeMotionReady } from '../../ui/home-visual-v1.js';
import { drawScrollingHome } from './scrolling-scene.js';

export class HomePage {
  constructor({ onAction, controller }) {
    this.controller = controller;
    this.layout = null;
    this.elapsed = 0;
    this.sceneOrigin = null;
    this.buttonScales = new Map();
    this.input = new ButtonInput(() => this.layout
      ? this.layout.buttons.filter(({ native }) => !native) : [], onAction);
  }

  resize(viewport) {
    this.viewport = viewport;
    this.layout = getHomeLayout(viewport);
    // Keep small utility controls comfortable to tap after short-screen scaling.
    for (const button of this.layout.buttons.filter(b => b.id === 'settings' || b.native)) {
      const size = Math.max(button.width, 44 / viewport.scale);
      button.hitArea = { x: button.x + (button.width - size) / 2,
        y: button.y + (button.height - size) / 2, width: size, height: size };
    }
    this.input.reset();
  }

  render(ctx, elapsed) {
    this.delta = Math.max(0, Math.min(.05, elapsed - this.elapsed));
    this.elapsed = elapsed;
    if (this.sceneOrigin === null) this.sceneOrigin = elapsed;
    if (homeMotionReady(ctx)) {
      this.renderMotion(ctx, elapsed);
      return;
    }
    const { width, height } = this.viewport;
    const { buttons, title } = this.layout;
    if (!drawHomeBackground(ctx, 0, 0, width, height, elapsed)) {
      ctx.fillStyle = theme.sky;
      ctx.fillRect(0, 0, width, height);
    }
    drawPushAnimation(ctx, width, getHomeGroundBaseline(ctx, width, height) - 2, elapsed);

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
        if (button.primary) {
          const pulse = pressed ? 0.98 : 1 + Math.sin(elapsed * Math.PI * 2 / 2.8) * 0.007;
          ctx.save();
          ctx.translate(button.x + button.width / 2 + shift, button.y + button.height / 2 + shift);
          ctx.scale(pulse, pulse);
          ctx.shadowColor = 'rgba(255, 219, 72, 0.42)';
          ctx.shadowBlur = pressed ? 4 : 8;
          const drawn = drawHomeIcon(ctx, button.art, -button.width / 2, -button.height / 2,
            button.width, button.height);
          ctx.restore();
          if (drawn) return;
        } else if (drawHomeIcon(ctx, button.art, button.x + shift, button.y + shift,
          button.width, button.height)) return;
        drawButton(ctx, button, pressed);
        return;
      }
      if (button.native) {
        text(ctx, button.label, button.x + button.width / 2, button.y + button.labelOffset,
          { size: button.fontSize, color: '#FFF4C7', outline: 3, font: getHomeFont() });
        return;
      }
      if (!button.icon) { drawButton(ctx, button, pressed); return; }
      const shift = pressed ? 3 : 0;
      ctx.save();
      ctx.translate(shift, shift);
      ctx.save();
      if (!drawHomeIcon(ctx, button.icon, button.x + 5, button.y, 64)) {
        illustration(ctx, button.id === 'friends' ? 'star' : 'question',
          button.x + 11, button.y + 4, 52);
      }
      ctx.restore();
      text(ctx, button.label, button.x + button.width / 2, button.y + button.labelOffset,
        { size: button.fontSize, color: '#FFF4C7', outline: 3, font: getHomeFont() });
      ctx.restore();
    });
  }

  renderMotion(ctx, elapsed) {
    const { title, scene, buttons } = this.layout;
    const art = (name, rect) => drawHomeVisual(ctx, name,
      rect.x, rect.y, rect.width, rect.height);
    const sceneTime = elapsed - this.sceneOrigin;
    drawScrollingHome(ctx, this.viewport, scene, sceneTime, art,
      (frame, x, y, width, height, progress) =>
        drawHomeWalkFrame(ctx, frame, x, y, width, height, progress));
    art('logo', title);
    this.drawVisualControls(ctx, sceneTime, art, buttons);
  }

  drawVisualControls(ctx, sceneTime, art, buttons) {
    // Transparent button art and its label share the same press transform and hit bounds.
    for (const button of buttons) {
      const pressed = this.input.activeId === button.id;
      const target = pressed ? .955 : button.id === 'start'
        ? 1 + .006 * Math.sin(sceneTime * Math.PI * 2 / 4.8) : 1;
      const previous = this.buttonScales.get(button.id) ?? 1;
      const scale = previous + (target - previous) * (1 - Math.exp(-this.delta * 24));
      this.buttonScales.set(button.id, scale);
      ctx.save();
      ctx.translate(button.x + button.width / 2, button.y + button.height / 2 + (1-scale)*50);
      ctx.scale(scale, scale);
      const destination = { x: -button.width / 2, y: -button.height / 2,
        width: button.width, height: button.height };
      art(button.id === 'friends' ? 'ranking' : button.id, destination);
      if (['start', 'levels', 'friends'].includes(button.id)) {
        const primary = button.id === 'start';
        this.drawVisualText(ctx, button.label, primary ? 0 : button.width * .20,
          primary ? 3 : 7, primary ? 42 : 23,
          primary ? '#FFF9E9' : button.id === 'friends' ? '#174E7A' : '#245A36',
          primary ? '#954323' : '#FFF8DA', primary ? 5 : 2);
      }
      ctx.restore();
    }
  }

  drawVisualText(ctx, value, x, y, size, fill, stroke, lineWidth) {
    ctx.save();
    ctx.font = `900 ${size}px ${getHomeFont()}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.strokeText(value, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(value, x, y);
    ctx.restore();
  }

  getGameClubButtonBounds() {
    const button = this.layout && this.layout.buttons.find(({ id }) => id === 'gameClub');
    if (!button) return null;
    if (button.hitArea) return { ...button.hitArea };
    const size = button.nativeIconSize;
    return { x: button.x + (button.width - size) / 2, y: button.y,
      width: size, height: size };
  }

  handlePointer(type, point) {
    this.input.handle(type, point);
  }
  pause() {
    this.input.reset(); this.buttonScales.clear();
    this.sceneOrigin = null;
  }
}
