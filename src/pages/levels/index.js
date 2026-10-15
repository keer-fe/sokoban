import { Screen, lock } from '../../ui/screen.js';
import { ButtonInput, contains } from '../../ui/button.js';
import { circle, line, panel, text } from '../../ui/draw.js';
import { illustration } from '../../ui/illustrations.js';
import { drawHomeIcon } from '../../ui/home-icons.js';
import { getHomeFont } from '../../ui/home-font.js';
import { parseLevel } from '../../game/engine.js';
import { cloudUIFileID, publicUISource } from '../../ui/cloud-assets.js';

const DARK_WOOD = '#4A2716';
const GOLD = '#FFD15E';
const GREEN = '#55B941';
const GREEN_DARK = '#2F7E31';
const FONT = () => getHomeFont();
const GRID_COLUMNS = 2;
const ROW_HEIGHT = 150;
const LEVEL_ASSET_SOURCES = Object.freeze({
  background: publicUISource('levels-texture-v2.png'),
  starSelected: publicUISource('star-selected-v2.png'),
  starUnselected: publicUISource('star-unselected-v2.png'),
  currentLevel: publicUISource('current-level-v5.png'),
});
const LEVEL_ASSET_FILE_IDS = Object.freeze({
  background: cloudUIFileID('levels-texture-v2.png'),
  starSelected: cloudUIFileID('star-selected-v2.png'),
  starUnselected: cloudUIFileID('star-unselected-v2.png'),
  currentLevel: cloudUIFileID('current-level-v5.png'),
});

function drawCoverImage(ctx, image, x, y, width, height, frosted) {
  if (!image?.ready || !image.width || !image.height) return false;
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  if (sourceRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / targetRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }
  ctx.save();
  if (frosted && typeof ctx.filter === 'string') ctx.filter = 'blur(9px)';
  const bleed = frosted ? 16 : 0;
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight,
    x - bleed, y - bleed, width + bleed * 2, height + bleed * 2);
  ctx.restore();
  return true;
}

function drawLevelStars(ctx, count, x, y, size, gap, assets) {
  for (let i = 0; i < 3; i += 1) {
    const image = assets[i < count ? 'starSelected' : 'starUnselected'];
    if (image?.ready) ctx.drawImage(image, x + i * (size + gap), y, size, size);
  }
}

const campaignMeta = {
  classic: { short: '经典', title: '经典模式', note: '原味推箱子', accent: '#68C84D', icon: 'campaignClassic' },
  adventure: { short: '冒险', title: '机关冒险', note: '机关与特殊地形', accent: '#F0A43D', icon: 'campaignAdventure' },
  coop: { short: '双人', title: '双人合作', note: '和伙伴一起解谜', accent: '#4CA8E8', icon: 'campaignCoop' },
  pk: { short: '对战', title: '双人PK', note: '和伙伴一较高下', accent: '#EF7050', icon: 'campaignPk' },
};

function drawBack(ctx, button, pressed) {
  const shift = pressed ? 3 : 0;
  ctx.save();
  ctx.translate(shift, shift);
  if (drawHomeIcon(ctx, 'backButton', button.x, button.y, button.width, button.height)) {
    ctx.restore();
    return;
  }
  circle(ctx, button.x + 22, button.y + 22, 21, GOLD, 4, DARK_WOOD);
  line(ctx, [[button.x + 27, button.y + 12], [button.x + 17, button.y + 22],
    [button.x + 27, button.y + 32]], DARK_WOOD, 4);
  ctx.restore();
}

function drawCampaignTab(ctx, button, active, available, pressed) {
  const shift = pressed ? 3 : 0;
  ctx.save();
  ctx.translate(shift, shift);
  panel(ctx, button.x, button.y, button.width, button.height, {
    fill: active ? GREEN : '#F2D891', stroke: active ? GREEN_DARK : '#B77A35',
    lineWidth: active ? 3 : 2, radius: 9,
    shadow: pressed ? null : active ? GREEN_DARK : null, offset: 2,
  });
  text(ctx, campaignMeta[button.campaign].short,
    button.x + button.width / 2 + (available ? 0 : 6), button.y + button.height / 2, {
      size: 16, color: active ? '#FFF8D5' : DARK_WOOD,
      outline: active ? 2 : 0, font: FONT(),
    });
  if (!available) lock(ctx, button.x + 11, button.y + 11, 15);
  ctx.restore();
}

function drawLevelCard(ctx, button, data, pressed) {
  const { locked, record, recommended, number, preview, assets } = data;
  const muted = locked;
  ctx.save();
  if (pressed) ctx.translate(0, 3);
  const board = preview.board;
  const tile = Math.min((button.width - 62) / board.width, 84 / board.height, 16);
  const left = button.x + (button.width - board.width * tile) / 2;
  const top = button.y + 8 + (84 - board.height * tile) / 2;
  const mapBottom = top + board.height * tile;
  for (const pos of board.floors) {
    const x = left + (pos % board.width) * tile;
    const y = top + Math.floor(pos / board.width) * tile;
    ctx.fillStyle = muted ? 'rgba(111,119,123,0.32)' : 'rgba(226,190,124,0.32)';
    ctx.fillRect(x + 0.7, y + 0.7, tile - 1.4, tile - 1.4);
  }
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 4;
  for (const pos of board.walls) {
    const x = left + (pos % board.width) * tile;
    const y = top + Math.floor(pos / board.width) * tile;
    ctx.fillStyle = muted ? '#575E63' : '#85552E';
    ctx.fillRect(x, y, tile + 0.3, tile + 3);
  }
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  for (const pos of board.walls) {
    const x = left + (pos % board.width) * tile;
    const y = top + Math.floor(pos / board.width) * tile;
    ctx.fillStyle = muted ? '#A1A7A8' : '#E3BD79';
    ctx.fillRect(x + 0.6, y + 0.6, tile - 1.2, tile - 1.2);
    ctx.fillStyle = muted ? '#C5C9C8' : '#FFF0BA';
    ctx.fillRect(x + 0.6, y + 0.6, tile - 1.2, Math.max(1, tile * 0.13));
  }
  for (const pos of board.goals) {
    const x = left + (pos % board.width + 0.5) * tile;
    const y = top + (Math.floor(pos / board.width) + 0.5) * tile;
    circle(ctx, x, y, Math.max(2, tile * 0.22), muted ? '#777E80' : '#E7A830',
      Math.max(1, tile * 0.08), muted ? '#C6CBCA' : '#FFF0A8');
  }
  for (const pos of board.boxes) {
    const x = left + (pos % board.width) * tile;
    const y = top + Math.floor(pos / board.width) * tile;
    panel(ctx, x + 1, y + 1, tile - 2, tile - 2, {
      fill: muted ? '#737A7C' : '#C77A32', stroke: muted ? '#D0D4D3' : '#6D3919',
      lineWidth: Math.max(1, tile * 0.1), radius: Math.max(1, tile * 0.08),
    });
    line(ctx, [[x + tile * 0.25, y + tile * 0.25], [x + tile * 0.75, y + tile * 0.75]],
      muted ? '#D0D4D3' : '#FFE1A0', Math.max(1, tile * 0.1));
    line(ctx, [[x + tile * 0.75, y + tile * 0.25], [x + tile * 0.25, y + tile * 0.75]],
      muted ? '#D0D4D3' : '#FFE1A0', Math.max(1, tile * 0.1));
  }
  if (muted) {
    const x = button.x + button.width / 2;
    const y = top + board.height * tile / 2 - 10;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    lock(ctx, x - 22, y - 10, 44);
    ctx.shadowBlur = 0;
  }
  const label = String(number).padStart(2, '0');
  ctx.font = `900 36px ${FONT()}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 6;
  ctx.strokeStyle = muted ? '#D2D5D3' : '#FFFDF1';
  ctx.strokeText(label, left - 4, mapBottom - 7);
  ctx.fillStyle = muted ? '#66727A' : '#4B91C1';
  ctx.fillText(label, left - 4, mapBottom - 7);
  if (recommended && !locked) {
    const badgeX = left + board.width * tile / 2 - 16;
    const badgeY = top + board.height * tile / 2 - 16;
    if (assets.currentLevel?.ready) {
      ctx.drawImage(assets.currentLevel, badgeX, badgeY, 32, 32);
    } else {
      circle(ctx, badgeX + 16, badgeY + 16, 15, '#ED5425', 2, '#FFFFFF');
      ctx.beginPath();
      ctx.moveTo(badgeX + 12, badgeY + 8);
      ctx.lineTo(badgeX + 24, badgeY + 16);
      ctx.lineTo(badgeX + 12, badgeY + 24);
      ctx.closePath();
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }
  }
  drawLevelStars(ctx, record?.stars || 0,
    button.x + button.width / 2 - 37, mapBottom + 7, 22, 4, assets);
  ctx.restore();
}

export class LevelsPage extends Screen {
  constructor(controller, onAction) {
    super(controller, onAction);
    this.scrollOffsets = { classic: 0, adventure: 0, coop: 0 };
    this.campaignScroll = 0;
    this.previews = new Map();
    this.levelAssets = {};
    if (controller.platform.createImage) {
      Object.entries(LEVEL_ASSET_SOURCES).forEach(([name]) => {
        const image = controller.platform.createImage();
        image.ready = false;
        image.onload = () => { image.ready = true; };
        image.onerror = () => {
          image.ready = false;
          const fallback = LEVEL_ASSET_SOURCES[name];
          if (image.src !== fallback) image.src = fallback;
          else console.warn(`Level asset failed to load: ${name}`);
        };
        this.levelAssets[name] = image;
      });
      const assignSources = (sources) => Object.entries(sources).forEach(([name, source]) => {
        if (this.levelAssets[name]) this.levelAssets[name].src = source;
      });
      if (controller.platform.resolveCloudFiles) {
        controller.platform.resolveCloudFiles(LEVEL_ASSET_FILE_IDS)
          .then(assignSources)
          .catch((error) => {
            console.warn('Cloud level images failed to resolve.', error);
            assignSources(LEVEL_ASSET_SOURCES);
          });
      } else assignSources(LEVEL_ASSET_SOURCES);
    }
    // Keep navigation local to this screen; gameplay actions retain their existing route.
    this.input = new ButtonInput(() => this.buttons.map(button => {
      if (!button.id.startsWith('level:') && !button.id.startsWith('campaign:')) return button;
      const y = Math.max(button.y, this.listBounds.y);
      return { ...button, y, height: Math.max(0, Math.min(button.y + button.height,
        this.listBounds.y + this.listBounds.height) - y) };
    }), onAction);
    this.drag = null;
  }

  layout() {
    const c = this.controller;
    const backY = this.viewport.navigationCenterY - 24;
    this.header = { top: backY, bottom: backY + 62 };
    this.listBounds = {
      x: 0, y: this.header.bottom, width: 414,
      height: Math.max(1, this.viewport.height - this.viewport.safeBottom - this.header.bottom - 8),
    };
    if (c.levelView === 'campaigns') {
      const cardWidth = 178;
      const cardHeight = cardWidth * 2 / 3;
      const rowHeight = cardHeight + 16;
      const rowCount = Math.ceil(Object.keys(campaignMeta).length / GRID_COLUMNS);
      this.entries = [];
      this.contentHeight = Math.max(this.listBounds.height,
        rowCount * rowHeight + 20);
      this.maxScroll = Math.max(0, this.contentHeight - this.listBounds.height);
      this.campaignScroll = Math.max(0, Math.min(this.maxScroll, this.campaignScroll));
      this.buttons = [
        { id: 'home', label: '', x: 16, y: backY, width: 48, height: 48 },
        ...Object.keys(campaignMeta).map((campaign, i) => ({
          id: `campaign:${campaign}`, campaign, label: campaignMeta[campaign].title,
          x: 22 + (i % GRID_COLUMNS) * 190,
          y: this.listBounds.y + 10 + Math.floor(i / GRID_COLUMNS) * rowHeight - this.campaignScroll,
          width: cardWidth, height: cardHeight,
        })),
      ];
      return;
    }
    this.entries = c.campaignEntries();
    const rowCount = Math.ceil(this.entries.length / GRID_COLUMNS);
    this.contentHeight = Math.max(this.listBounds.height, rowCount * ROW_HEIGHT + 92);
    this.maxScroll = Math.max(0, this.contentHeight - this.listBounds.height);
    this.scrollOffsets[c.levelCampaign] = Math.min(this.maxScroll,
      Math.max(0, this.scrollOffsets[c.levelCampaign] || 0));
    const scroll = this.scrollOffsets[c.levelCampaign];
    this.buttons = [
      { id: 'level-campaigns', label: '', x: 16,
        y: backY, width: 48, height: 48 },
      ...this.entries.map(({ index }, i) => ({
        id: `level:${index}`, label: '', x: 22 + (i % GRID_COLUMNS) * 190,
        y: this.listBounds.y + 10 + Math.floor(i / GRID_COLUMNS) * ROW_HEIGHT - scroll,
        width: 178, height: 138,
      })).filter(button => button.y + button.height >= this.listBounds.y
        && button.y <= this.listBounds.y + this.listBounds.height),
    ];
  }

  recommendedIndex() {
    if (!this.controller.campaignAvailable()) return -1;
    const open = this.entries.find(({ level, index }) =>
      this.controller.progress.isUnlocked(index) && !this.controller.progress.state.records[level.id]);
    if (open) return open.index;
    return this.entries.length ? this.entries[this.entries.length - 1].index : -1;
  }

  render(ctx) {
    this.layout();
    const c = this.controller;
    const meta = campaignMeta[c.levelCampaign];
    const sideFill = this.viewport.offsetX / this.viewport.scale;
    const fullX = -sideFill;
    const fullWidth = this.viewport.width + sideFill * 2;
    if (!drawCoverImage(ctx, this.levelAssets.background, fullX, 0, fullWidth,
      this.viewport.height, false)) {
      ctx.fillStyle = '#E8D3A8';
      ctx.fillRect(fullX, 0, fullWidth, this.viewport.height);
    }

    if (c.levelView === 'campaigns') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.listBounds.x, this.listBounds.y, this.listBounds.width, this.listBounds.height);
      ctx.clip();
      this.drawCampaignChooser(ctx);
      this.drawScrollbar(ctx, this.campaignScroll);
      ctx.restore();
      this.drawHeader(ctx, { title: '选择模式' });
      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(this.listBounds.x, this.listBounds.y, this.listBounds.width, this.listBounds.height);
    ctx.clip();
    this.drawList(ctx, this.recommendedIndex());
    ctx.restore();
    this.drawHeader(ctx, meta);
  }

  drawHeader(ctx, meta) {
    const back = this.buttons.find(button => button.id === 'level-campaigns' || button.id === 'home');
    text(ctx, meta.title, back.x + back.width + 12, back.y + back.height / 2 + 4, {
      size: 25, color: '#FFF2B5', outline: 5, spacing: 2, align: 'left', font: FONT(),
    });
    drawBack(ctx, back, this.input.activeId === back.id);
  }

  drawCampaignChooser(ctx) {
    const c = this.controller;
    for (const button of this.buttons.filter(item => item.id.startsWith('campaign:'))) {
      const meta = campaignMeta[button.campaign];
      const available = c.campaignAvailable(button.campaign);
      const developing = button.campaign === 'coop' || button.campaign === 'pk';
      const pressed = this.input.activeId === button.id;
      ctx.save();
      if (pressed) ctx.translate(0, 3);
      const centerX = button.x + button.width / 2;
      const cardHeight = button.width * 2 / 3;
      // Clip the JPEG's white outer margin, including the bottom corners.
      ctx.save();
      const left = button.x + button.width * 0.014;
      const right = button.x + button.width * 0.986;
      const top = button.y + cardHeight * 0.027;
      const bottom = button.y + cardHeight * 0.973;
      const radius = button.width * 0.13;
      ctx.beginPath();
      ctx.moveTo(left + radius, top);
      ctx.lineTo(right - radius, top);
      ctx.arcTo(right, top, right, top + radius, radius);
      ctx.lineTo(right, bottom - radius);
      ctx.arcTo(right, bottom, right - radius, bottom, radius);
      ctx.lineTo(left + radius, bottom);
      ctx.arcTo(left, bottom, left, bottom - radius, radius);
      ctx.lineTo(left, top + radius);
      ctx.arcTo(left, top, left + radius, top, radius);
      ctx.closePath();
      ctx.clip();
      if (!drawHomeIcon(ctx, meta.icon, button.x, button.y, button.width, cardHeight)) {
        panel(ctx, button.x, button.y, button.width, cardHeight, {
          fill: '#E8D3A8', stroke: DARK_WOOD, lineWidth: 3, radius: 12,
        });
        text(ctx, meta.title, centerX, button.y + cardHeight / 2, {
          size: 20, color: '#FFF2B5', outline: 4, font: FONT(),
        });
      }
      if (!available || developing) {
        ctx.fillStyle = 'rgba(73, 61, 49, 0.36)';
        ctx.fillRect(button.x, button.y, button.width, cardHeight);
      }
      ctx.restore();
      if (!available || developing) {
        const lockSize = 36;
        lock(ctx, button.x + button.width - lockSize + 7, button.y - 5, lockSize);
      }
      ctx.restore();
    }
  }

  drawList(ctx, recommended) {
    const c = this.controller;
    if (!this.entries.length) {
      illustration(ctx, 'question', 167, this.listBounds.y + 72, 80);
      text(ctx, '双人合作开发中', 207, this.listBounds.y + 184,
        { size: 23, color: '#FFF4C7', outline: 4, font: FONT() });
      text(ctx, '叫上伙伴，一起动脑', 207, this.listBounds.y + 224,
        { size: 14, color: '#FFF4C7', outline: 2, font: FONT() });
      return;
    }
    for (const button of this.buttons.filter(item => item.id.startsWith('level:'))) {
      const index = Number(button.id.split(':')[1]);
      const level = c.levels[index];
      const record = c.progress.state.records[level.id];
      const locked = !c.campaignAvailable() || !c.progress.isUnlocked(index);
      if (!this.previews.has(level)) {
        const board = parseLevel(level);
        this.previews.set(level, { board, state: { player: board.player, boxes: board.boxes, facing: 'down' } });
      }
      drawLevelCard(ctx, button, {
        preview: this.previews.get(level),
        assets: this.levelAssets,
        locked, record,
        recommended: index === recommended, number: c.campaignLevelNumber(index),
        difficulty: level.difficulty, pendingStars: !level.minSteps,
      }, this.input.activeId === button.id);
    }
    const rowCount = Math.ceil(this.entries.length / GRID_COLUMNS);
    const endY = this.listBounds.y + rowCount * ROW_HEIGHT + 34
      - this.scrollOffsets[c.levelCampaign];
    line(ctx, [[126, endY - 17], [288, endY - 17]], 'rgba(255,244,199,0.42)', 1);
    text(ctx, '更多关卡正在开发中…', 207, endY, {
      size: 14, color: '#FFF4C7', outline: 2, font: FONT(),
    });
    this.drawScrollbar(ctx, this.scrollOffsets[c.levelCampaign]);
  }

  drawScrollbar(ctx, scroll) {
    if (this.maxScroll > 0) {
      const trackTop = this.listBounds.y + 12;
      const trackHeight = this.listBounds.height - 28;
      const thumbHeight = Math.max(46, trackHeight * this.listBounds.height / this.contentHeight);
      const thumbY = trackTop + (trackHeight - thumbHeight) * scroll / this.maxScroll;
      panel(ctx, 404, thumbY, 5, thumbHeight, { fill: 'rgba(255,244,199,0.72)', lineWidth: 0, radius: 3 });
    }
  }

  scrollBy(delta) {
    if (!Number.isFinite(delta) || !delta) return;
    if (this.controller.levelView === 'campaigns') {
      this.campaignScroll = Math.max(0, Math.min(this.maxScroll, this.campaignScroll + delta));
      this.layout();
      return;
    }
    const campaign = this.controller.levelCampaign;
    this.scrollOffsets[campaign] = Math.max(0, Math.min(this.maxScroll,
      this.scrollOffsets[campaign] + delta));
    this.layout();
  }

  handleWheel(deltaY, point) {
    if (contains(this.listBounds, point)) this.scrollBy(deltaY);
  }

  handlePointer(type, point) {
    if (type === 'cancel') {
      this.drag = null;
      this.input.handle(type, point);
      return;
    }
    if (type === 'start' && contains(this.listBounds, point)) {
      this.drag = { id: point.id, startY: point.y, lastY: point.y, moved: false };
      this.input.handle(type, point);
      return;
    }
    if (this.drag && point.id === this.drag.id) {
      if (type === 'move') {
        if (Math.abs(point.y - this.drag.startY) > 7) {
          this.drag.moved = true;
          this.input.reset();
        }
        if (this.drag.moved) this.scrollBy(this.drag.lastY - point.y);
        this.drag.lastY = point.y;
        return;
      }
      if (type === 'end') {
        const moved = this.drag.moved;
        this.drag = null;
        if (moved) this.input.reset();
        else this.input.handle(type, point);
        return;
      }
    }
    this.input.handle(type, point);
  }

  pause() {
    this.drag = null;
    super.pause();
  }
}
