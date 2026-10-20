import { Screen } from '../../ui/screen.js';
import { drawBoard, getBoardLayout } from '../../ui/board.js';
import { panel, text } from '../../ui/draw.js';
import { drawButton } from '../../ui/button.js';
import { drawLevelsBackground } from '../../ui/home-icons.js';
import { getHomeFont } from '../../ui/home-font.js';
import { cloudImageFileID, cloudUIFileID, publicImageSource, publicUISource } from '../../ui/cloud-assets.js';

const WOOD = '#4A2716';
const CREAM = '#FFF2B5';
const PAPER = '#F8E5B6';
const GREEN = '#58B947';
const GREEN_DARK = '#2E7B31';
const GOLD = '#FFD45A';
const FONT = () => getHomeFont();
export const gameBackgroundSource = publicImageSource('generated/game-layout-mask-v2.png');
export const directionPadSource = publicImageSource('generated/direction-pad-game-v1.png');
export const stepsCardSource = publicImageSource('generated/steps-hud-card-v1.png');
export const undoCardSource = publicImageSource('generated/undo-hud-card-v1.png');
export const menuButtonSource = publicUISource('menu-button-v1.png');
export const gameAssetFileIDs = Object.freeze({
  background: cloudImageFileID('generated/game-layout-mask-v2.png'),
  menu: cloudUIFileID('menu-button-v1.png'),
  directionPad: cloudImageFileID('generated/direction-pad-game-v1.png'),
  stepsCard: cloudImageFileID('generated/steps-hud-card-v1.png'),
  undoCard: cloudImageFileID('generated/undo-hud-card-v1.png'),
});

export function drawGameGround(ctx, width, height, tile, originX = 0, originY = 0) {
  const size = Number.isFinite(tile) && tile > 0 ? tile : 44;
  const radius = size * 0.11;
  const startX = ((originX % size) + size) % size - size;
  const startY = ((originY % size) + size) % size - size;

  ctx.fillStyle = '#118F69';
  ctx.fillRect(0, 0, width, height);
  for (let row = 0, y = startY; y < height; row += 1, y += size) {
    for (let col = 0, x = startX; x < width; col += 1, x += size) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + size - radius, y);
      ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
      ctx.lineTo(x + size, y + size - radius);
      ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
      ctx.lineTo(x + radius, y + size);
      ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fillStyle = (row + col) % 2 ? '#159B70' : '#1AA777';
      ctx.fill();
    }
  }
}

export function drawGameBackground(ctx, asset, width, height) {
  if (!asset?.ready || !asset.image.width || !asset.image.height) return false;
  // Preserve the complete artwork horizontally; only stretch it vertically to fit the viewport.
  ctx.drawImage(asset.image, 0, 0, asset.image.width, asset.image.height,
    0, 0, width, height);
  return true;
}

function drawMenu(ctx, button, pressed, asset) {
  const shift = pressed ? 3 : 0;
  ctx.save();
  ctx.translate(shift, shift);
  if (asset?.ready) ctx.drawImage(asset.image, button.x, button.y, button.width, button.height);
  else panel(ctx, button.x, button.y, button.width, button.height, {
      fill: GOLD, stroke: WOOD, lineWidth: 4, radius: 12,
      shadow: pressed ? null : WOOD, offset: 4,
    });
  ctx.restore();
}

function drawArrow(ctx, button, pressed) {
  const shift = pressed ? 4 : 0;
  ctx.save();
  ctx.translate(shift, shift);
  panel(ctx, button.x, button.y, button.width, button.height, {
    fill: GREEN, stroke: WOOD, lineWidth: 4, radius: 12,
    shadow: pressed ? null : GREEN_DARK, offset: 5,
  });
  const cx = button.x + button.width / 2;
  const cy = button.y + button.height / 2;
  const points = {
    up: [[cx, cy - 15], [cx - 10, cy - 4], [cx - 4, cy - 4], [cx - 4, cy + 14],
      [cx + 4, cy + 14], [cx + 4, cy - 4], [cx + 10, cy - 4]],
    down: [[cx, cy + 15], [cx - 10, cy + 4], [cx - 4, cy + 4], [cx - 4, cy - 14],
      [cx + 4, cy - 14], [cx + 4, cy + 4], [cx + 10, cy + 4]],
    left: [[cx - 15, cy], [cx - 4, cy - 10], [cx - 4, cy - 4], [cx + 14, cy - 4],
      [cx + 14, cy + 4], [cx - 4, cy + 4], [cx - 4, cy + 10]],
    right: [[cx + 15, cy], [cx + 4, cy - 10], [cx + 4, cy - 4], [cx - 14, cy - 4],
      [cx - 14, cy + 4], [cx + 4, cy + 4], [cx + 4, cy + 10]],
  }[button.id];
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fillStyle = '#FFFDF1';
  ctx.fill();
  ctx.strokeStyle = WOOD;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

export function drawDirectionPad(ctx, asset, bounds, activeButton) {
  if (!asset?.ready) return false;
  // Remove transparent padding so visual margins can align with the wooden frame.
  ctx.drawImage(asset.image, 64, 64, 1126, 1126,
    bounds.x, bounds.y, bounds.width, bounds.height);
  if (activeButton) {
    const centerX = activeButton.x + activeButton.width / 2;
    const centerY = activeButton.y + activeButton.height / 2;
    const radius = activeButton.width * 0.42;
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = WOOD;
    ctx.beginPath();
    ctx.arc(centerX, centerY + 2, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#FFF2B5';
    ctx.lineWidth = Math.max(2, activeButton.width * 0.06);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(centerX - radius * 0.35, centerY - radius * 0.35,
      Math.max(2, activeButton.width * 0.06), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  return true;
}

function drawCircleValue(ctx, value, centerX, centerY) {
  ctx.save();
  ctx.font = `900 17px ${FONT()}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = WOOD;
  const metrics = ctx.measureText(String(value));
  const ascent = metrics.actualBoundingBoxAscent ?? 8.5;
  const descent = metrics.actualBoundingBoxDescent ?? 3.5;
  ctx.fillText(String(value), centerX, centerY + (ascent - descent) / 2);
  ctx.restore();
}

function drawHudCard(ctx, asset, bounds, label, value, valueCenter, pressed = false) {
  const shift = pressed ? 3 : 0;
  ctx.save();
  ctx.translate(shift, shift);
  if (asset?.ready) ctx.drawImage(asset.image, bounds.x, bounds.y, bounds.width, bounds.height);
  else panel(ctx, bounds.x, bounds.y, bounds.width, bounds.height, {
    fill: PAPER, stroke: WOOD, lineWidth: 4, radius: 12,
    shadow: pressed ? null : '#B57837', offset: 4,
  });
  const centerY = bounds.y + bounds.height / 2;
  text(ctx, label, bounds.x + bounds.width * 0.53, centerY,
    { size: 15, color: WOOD, font: FONT() });
  drawCircleValue(ctx, value,
    bounds.x + bounds.width * valueCenter.x,
    bounds.y + bounds.height * valueCenter.y);
  ctx.restore();
}

export class GamePage extends Screen {
  constructor(controller, onAction) {
    super(controller, onAction);
    this.menuAsset = null;
    this.directionPadAsset = null;
    this.stepsCardAsset = null;
    this.undoCardAsset = null;
    this.renderedGame = null;
    this.renderedSteps = null;
    this.renderedBoxes = '';
    this.playerPose = { kind: 'walk', frame: 1 };
    if (controller.platform.createImage) {
      const background = controller.platform.createImage();
      this.backgroundAsset = { image: background, ready: false };
      background.onload = () => { this.backgroundAsset.ready = true; };
      background.onerror = () => { this.backgroundAsset.ready = false; };
      background.src = gameBackgroundSource;
      const image = controller.platform.createImage();
      this.menuAsset = { image, ready: false };
      image.onload = () => { this.menuAsset.ready = true; };
      image.onerror = () => { this.menuAsset.ready = false; };
      image.src = menuButtonSource;
      const directionPad = controller.platform.createImage();
      this.directionPadAsset = { image: directionPad, ready: false };
      directionPad.onload = () => { this.directionPadAsset.ready = true; };
      directionPad.onerror = () => { this.directionPadAsset.ready = false; };
      directionPad.src = directionPadSource;
      const stepsCard = controller.platform.createImage();
      this.stepsCardAsset = { image: stepsCard, ready: false };
      stepsCard.onload = () => { this.stepsCardAsset.ready = true; };
      stepsCard.onerror = () => { this.stepsCardAsset.ready = false; };
      stepsCard.src = stepsCardSource;
      const undoCard = controller.platform.createImage();
      this.undoCardAsset = { image: undoCard, ready: false };
      undoCard.onload = () => { this.undoCardAsset.ready = true; };
      undoCard.onerror = () => { this.undoCardAsset.ready = false; };
      undoCard.src = undoCardSource;
      if (controller.platform.resolveCloudFiles) {
        controller.platform.resolveCloudFiles(gameAssetFileIDs).then((sources) => {
          background.src = sources.background;
          image.src = sources.menu;
          directionPad.src = sources.directionPad;
          stepsCard.src = sources.stepsCard;
          undoCard.src = sources.undoCard;
        }).catch((error) => console.warn('Cloud game UI images failed to resolve.', error));
      }
    }
  }

  layout() {
    this.top = this.viewport.navigationCenterY - 24;
    const bottom = this.viewport.height - this.viewport.safeBottom;
    const available = bottom - this.top;
    const compact = available < 650;
    this.compact = compact;
    this.headerHeight = 62;
    const controlsHeight = compact ? 164 : 214;
    this.controlsY = bottom - controlsHeight;
    this.statusY = this.controlsY - (compact ? 52 : 60);
    const boardBottom = this.controller.replay ? this.statusY : this.controlsY - 12;
    const boardTop = this.top + this.headerHeight + 12;
    this.boardBounds = {
      x: 30,
      y: boardTop,
      width: 354,
      height: Math.max(128, boardBottom - boardTop),
    };
    const gap = compact ? 4 : 6;
    const controlsInnerTop = this.controlsY + (compact ? 10 : 22);
    const controlsInnerBottom = bottom - (compact ? 10 : 16);
    const controlsFrameLeft = 30;
    const controlsFrameRight = 384;
    const controlsFrameInset = 10;
    const directionPadSize = controlsInnerBottom - controlsInnerTop - controlsFrameInset * 2;
    const key = (directionPadSize - gap * 2) / 3;
    const centerX = controlsFrameRight - controlsFrameInset - directionPadSize / 2;
    const directionPadOffsetY = 2;
    const verticalTop = controlsInnerTop
      + (controlsInnerBottom - controlsInnerTop - directionPadSize) / 2
      + directionPadOffsetY;
    this.controlsFrameBounds = {
      x: controlsFrameLeft,
      y: controlsInnerTop,
      width: controlsFrameRight - controlsFrameLeft,
      height: controlsInnerBottom - controlsInnerTop,
    };
    this.directionPadBounds = {
      x: centerX - directionPadSize / 2,
      y: verticalTop,
      width: directionPadSize,
      height: directionPadSize,
    };
    const leftControlHeight = 52;
    const leftControlGap = compact ? 12 : 18;
    const leftControlsTop = (controlsInnerTop + controlsInnerBottom
      - (leftControlHeight * 2 + leftControlGap)) / 2;
    this.stepsBounds = {
      x: 36,
      y: leftControlsTop,
      width: 162,
      height: leftControlHeight,
    };
    const touchExpansion = compact ? 10 : 12;
    const upButton = { id: 'up', x: centerX - key / 2, y: verticalTop, width: key, height: key };
    const leftButton = { id: 'left', x: centerX - key - gap - key / 2,
      y: verticalTop + key + gap, width: key, height: key };
    const rightButton = { id: 'right', x: centerX + key / 2 + gap,
      y: verticalTop + key + gap, width: key, height: key };
    const downButton = { id: 'down', x: centerX - key / 2,
      y: verticalTop + (key + gap) * 2, width: key, height: key };
    upButton.hitArea = { x: upButton.x, y: upButton.y - touchExpansion,
      width: key, height: key + gap + touchExpansion };
    leftButton.hitArea = { x: leftButton.x - touchExpansion, y: leftButton.y,
      width: key + gap + touchExpansion, height: key };
    rightButton.hitArea = { x: rightButton.x - gap, y: rightButton.y,
      width: key + gap + touchExpansion, height: key };
    downButton.hitArea = { x: downButton.x, y: downButton.y - gap,
      width: key, height: key + gap + touchExpansion };
    this.buttons = [
      { id: 'menu', x: 18, y: this.top, width: 48, height: 48 },
      { id: 'undo', x: 36, y: leftControlsTop + leftControlHeight + leftControlGap,
        width: 162, height: leftControlHeight },
      upButton, leftButton, rightButton, downButton,
    ];
    if (this.controller.replay) {
      const c = this.controller;
      this.buttons = [
        { id: 'replay-exit', label: '返回', x: 18, y: this.top + 10, width: 70, height: 42, fontSize: 16 },
        ...[['replay-back', '上一步'], ['replay-play', c.replay.playing ? '暂停' : c.game.complete ? '再播放' : '播放'],
          ['replay-forward', '下一步']].map(([id, label], i) => ({ id, label, x: 20 + i * 126,
          y: this.controlsY + 32, width: 116, height: 48, fontSize: 17,
          disabled: id === 'replay-back' ? c.game.state.steps === 0 : id === 'replay-forward' && c.game.complete })),
        { id: 'replay-reset', label: '回到起点', x: 139, y: this.controlsY + 98, width: 136, height: 44, fontSize: 17 },
      ];
    }
    if (this.controller.game && Math.max(this.controller.game.board.width, this.controller.game.board.height) > 12) {
      this.buttons.push({ id: 'zoom', label: this.controller.zoom ? '查看全图' : '放大棋盘',
        x: 304, y: this.controller.replay ? this.controlsY + 100 : this.controlsY - 48,
        width: 92, height: 36, fontSize: 13 });
    }
  }

  render(ctx, elapsed = 0) {
    this.layout();
    const c = this.controller;
    const game = c.game;
    const boxes = game.state.boxes.join(',');
    if (this.renderedGame !== game) {
      this.renderedGame = game;
      this.renderedSteps = game.state.steps;
      this.renderedBoxes = boxes;
      this.playerPose = { kind: 'walk', frame: (game.state.steps + 1) % 3 };
    } else if (game.state.steps > this.renderedSteps) {
      this.playerPose = {
        kind: boxes === this.renderedBoxes ? 'walk' : 'push',
        frame: (game.state.steps + 1) % 3,
      };
      this.renderedSteps = game.state.steps;
      this.renderedBoxes = boxes;
    } else if (game.state.steps !== this.renderedSteps || boxes !== this.renderedBoxes) {
      this.renderedSteps = game.state.steps;
      this.renderedBoxes = boxes;
      this.playerPose = { kind: 'walk', frame: (game.state.steps + 1) % 3 };
    }
    const boardLayout = getBoardLayout(game, this.boardBounds, c.zoom);
    drawGameGround(ctx, 414, this.viewport.height,
      boardLayout.cell, boardLayout.x, boardLayout.y);
    if (!drawGameBackground(ctx, this.backgroundAsset, 414, this.viewport.height)) {
      drawLevelsBackground(ctx, 0, 0, 414, this.viewport.height, true);
    }

    const header = c.pk ? `玩家 ${c.pk.room.me?.seat || '-'} · 在线 PK` : `第 ${c.campaignLevelNumber()} 关`;
    text(ctx, header, 78, this.top + 28,
      { size: 25, color: CREAM, outline: 5, spacing: 2,
        align: 'left', font: FONT() });

    drawBoard(ctx, game, this.boardBounds, c.zoom, elapsed, this.playerPose);

    if (!c.replay) {
      const seconds = c.pk ? Math.floor(c.pkElapsedMs() / 1000) : game.state.steps;
      drawHudCard(ctx, this.stepsCardAsset, this.stepsBounds, c.pk ? '用时' : '步数', seconds,
        { x: 0.828, y: 0.5 });
    } else {
      text(ctx, `${game.state.steps} / ${c.replay.moves.length} 步`, 207, this.statusY + 27,
        { size: 20, color: GOLD, outline: 3, font: FONT() });
    }

    const directionButtons = this.buttons.filter(({ id }) => ['up', 'down', 'left', 'right'].includes(id));
    const activeDirection = directionButtons.find(({ id }) => this.input.activeId === id);
    const directionPadDrawn = !c.replay
      && drawDirectionPad(ctx, this.directionPadAsset, this.directionPadBounds, activeDirection);
    for (const button of this.buttons) {
      const pressed = this.input.activeId === button.id;
      if (button.id === 'menu') drawMenu(ctx, button, pressed, this.menuAsset);
      else if (button.id === 'undo') {
        drawHudCard(ctx, this.undoCardAsset, button, '撤销', c.pk ? game.history.length : c.progress.state.cards,
          { x: 0.828, y: 0.47 }, pressed);
      }
      else if (['up', 'down', 'left', 'right'].includes(button.id)) {
        if (!directionPadDrawn) drawArrow(ctx, button, pressed);
      }
      else drawButton(ctx, button, pressed);
    }
  }
}
