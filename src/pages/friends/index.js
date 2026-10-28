import { Screen } from '../../ui/screen.js';
import { contains } from '../../ui/button.js';
import { circle, panel, text } from '../../ui/draw.js';
import { getHomeFont } from '../../ui/home-font.js';
import { leaderboardCloseFileID, leaderboardCloseSource } from '../../ui/leaderboard-assets.js';
import { cloudUIFileID, publicUISource } from '../../ui/cloud-assets.js';

const WOOD = '#A85E2E';
const DARK_WOOD = '#4A2716';
const GOLD = '#FFD15E';
const INK = '#753015';
function fitName(ctx, value, maxWidth) {
  const chars = Array.from(String(value || '玩家'));
  while (chars.length && ctx.measureText(`${chars.join('')}…`).width > maxWidth) chars.pop();
  return chars.length === Array.from(String(value || '玩家')).length ? chars.join('') : `${chars.join('')}…`;
}
function star(ctx, x, y, radius = 11) {
  ctx.save(); ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 ? radius * .48 : radius;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath(); ctx.fillStyle = '#FFD13D'; ctx.strokeStyle = '#A94A12';
  ctx.lineWidth = 2; ctx.fill(); ctx.stroke(); ctx.restore();
}
export const friendsAssetSources = {
  panel: publicUISource('friends-panel-v4.png'),
  refresh: publicUISource('friends-refresh-v2.png'),
  close: leaderboardCloseSource,
};
export const friendsAssetFileIDs = Object.freeze({
  panel: cloudUIFileID('friends-panel-v4.png'),
  refresh: cloudUIFileID('friends-refresh-v2.png'),
  close: leaderboardCloseFileID,
});
export const refreshIconSource = friendsAssetSources.refresh;

export class FriendsPage extends Screen {
  constructor(controller, onAction) {
    super(controller, onAction);
    this.swipe = null;
    this.worldScrollY = 0;
    this.worldAvatars = new Map();
    this.assets = {};
    this.rankingEmpty = null;
    this.rankingTitle = null;
    this.rankingPanel = null;
    this.rankingBackground = null;
    this.medals = [];
    if (controller.platform.createImage) {
      this.medals = ['gold', 'silver', 'bronze'].map((color) => {
        const entry = { image: controller.platform.createImage(), ready: false };
        entry.image.onload = () => { entry.ready = true; };
        entry.image.onerror = () => { entry.ready = false; };
        entry.image.src = `open-data/assets/medal-${color}.png`;
        return entry;
      });
      const entry = { image: controller.platform.createImage(), ready: false };
      entry.image.onload = () => { entry.ready = true; };
      entry.image.onerror = () => { entry.ready = false; };
      entry.image.src = 'open-data/assets/ranking-empty-v1.png';
      this.rankingEmpty = entry;
      const title = { image: controller.platform.createImage(), ready: false };
      title.image.onload = () => { title.ready = true; };
      title.image.onerror = () => { title.ready = false; };
      title.image.src = 'images/visual-v1/ranking/title-v1.png';
      this.rankingTitle = title;
      const panelArt = { image: controller.platform.createImage(), ready: false };
      panelArt.image.onload = () => { panelArt.ready = true; };
      panelArt.image.onerror = () => { panelArt.ready = false; };
      panelArt.image.src = 'images/visual-v1/ranking/panel-v1.png';
      this.rankingPanel = panelArt;
      const background = { image: controller.platform.createImage(), ready: false };
      background.image.onload = () => { background.ready = true; };
      background.image.onerror = () => { background.ready = false; };
      background.image.src = 'images/visual-v1/ranking/background-v1.png';
      this.rankingBackground = background;
    }
    if (controller.platform.createImage) Object.entries(friendsAssetSources).forEach(([name, fallback]) => {
      const entry = { image: controller.platform.createImage(), ready: false };
      entry.image.onload = () => { entry.ready = true; };
      entry.image.onerror = () => {
        entry.ready = false;
        if (entry.image.src !== fallback) entry.image.src = fallback;
      };
      this.assets[name] = entry;
    });
    const assignSources = (sources) => Object.entries(sources).forEach(([name, source]) => {
      if (this.assets[name]) this.assets[name].image.src = source;
    });
    if (controller.platform.resolveCloudFiles) {
      controller.platform.resolveCloudFiles(friendsAssetFileIDs)
        .then(assignSources)
        .catch((error) => {
          console.warn('Cloud leaderboard images failed to resolve.', error);
          assignSources(friendsAssetSources);
        });
    } else assignSources(friendsAssetSources);
  }

  layout() {
    this.swipe = null;
    const safeTop = this.viewport.safeTop + 4;
    const bottom = this.viewport.height - this.viewport.safeBottom;
    const frameHeight = Math.min(720, bottom - safeTop - 8);
    const top = safeTop;
    this.frame = { x: 18, y: top, width: 378, height: frameHeight };
    this.bounds = { x: 42, y: top + 200, width: 330, height: frameHeight - 228 };
    this.buttons = [
      { id: 'close', label: '×', x: 349, y: top + 37, width: 46, height: 46,
        fontSize: 29, fill: GOLD, color: DARK_WOOD },
      { id: 'friends:tab-friends', label: '好友榜', x: 68, y: top + 145, width: 139, height: 52 },
      { id: 'friends:tab-world', label: '世界榜', x: 207, y: top + 145, width: 139, height: 52 },
    ];
    this.buttons.push(
      { id: 'friends:refresh', label: '刷新', x: 36, y: top + 55, width: 49, height: 49,
        fontSize: 12, fill: '#FFE7A1', color: DARK_WOOD });
    this.buttons.push({ id: 'friends:invite', label: '邀请好友', x: 116,
      y: top + frameHeight - 77, width: 182, height: 48 });
    const bridge = this.controller.platform.friendBoard;
    if (bridge) bridge.send('resize', { width: this.bounds.width, height: this.bounds.height,
      pixelRatio: Math.min(3, this.viewport.pixelRatio), fontFamily: getHomeFont() });
  }
  render(ctx, elapsed = 0) {
    const { width, height } = this.viewport;
    if (this.rankingBackground?.ready) {
      const source = this.rankingBackground.image;
      const iw = source.width || 941, ih = source.height || 1672;
      const cropWidth = Math.min(iw, ih * width / height);
      ctx.drawImage(source, (iw - cropWidth) / 2, 0, cropWidth, ih, -50, 0, width + 100, height);
    } else {
      ctx.fillStyle = 'rgba(18, 43, 43, 0.15)';
      ctx.fillRect(0, 0, width, height);
    }

    const { y: top, height: frameHeight } = this.frame;
    if (this.rankingPanel?.ready) ctx.drawImage(this.rankingPanel.image,
      18, top + 70, 378, frameHeight - 70);
    else {
      panel(ctx, 18, top + 70, 378, frameHeight - 70,
        { fill: '#FFF2D2', stroke: '#24A829', lineWidth: 7, radius: 30, shadow: '#8A390F', offset: 5 });
      panel(ctx, 21, top + 72, 372, frameHeight - 76,
        { fill: '#FFF4DC', stroke: '#DDA052', lineWidth: 2, radius: 28 });
    }
    panel(ctx, 80, top + 4, 254, 90,
      { fill: '#A9571D', stroke: '#713016', lineWidth: 5, radius: 34, shadow: '#7E421E', offset: 5 });
    if (this.rankingTitle?.ready) ctx.drawImage(this.rankingTitle.image, 65, top - 4, 284, 112);
    else text(ctx, '排行榜', 207, top + 50,
      { size: 42, color: '#FFF7E7', outline: 5, font: getHomeFont(), spacing: 2 });
    const isWorld = this.controller.friendsTab === 'world';

    const { x, y, width: boardWidth, height: boardHeight } = this.bounds;
    this.drawTabs(ctx);
    panel(ctx, x, y, boardWidth, 29, { fill: '#F8D9A6', lineWidth: 0, radius: 9 });
    text(ctx, '排名', x + 31, y + 15, { size: 16, color: INK, font: getHomeFont() });
    text(ctx, '玩家', x + 143, y + 15, { size: 16, color: INK, font: getHomeFont() });
    text(ctx, '战绩', x + 291, y + 15, { size: 16, color: INK, font: getHomeFont() });
    const bridge = this.controller.platform.friendBoard;
    if (isWorld) {
      this.drawWorldBoard(ctx, x, y, boardWidth, boardHeight);
    } else if (bridge?.available && bridge.canvas) ctx.drawImage(bridge.canvas, x, y, boardWidth, boardHeight);
    else {
      text(ctx, '好友榜暂时无法加载', 207, y + boardHeight / 2 - 14,
        { size: 17, color: DARK_WOOD });
      text(ctx, '请稍后刷新重试', 207, y + boardHeight / 2 + 18,
        { size: 13, color: '#8C674C' });
    }
    const invite = this.buttons.find(button => button.id === 'friends:invite');
    if (invite) {
      invite.disabled = isWorld;
    }
    const refreshButton = this.buttons.find((button) => button.id === 'friends:refresh');
    if (refreshButton) refreshButton.label = this.assets.refresh?.ready ? '' : '刷新';
    const close = this.buttons.find((button) => button.id === 'close');
    if (this.assets.close?.ready) ctx.drawImage(this.assets.close.image,
      close.x, close.y, close.width, close.height);
    else {
      circle(ctx, close.x + close.width / 2, close.y + close.height / 2, 22, GOLD, 4, DARK_WOOD);
      text(ctx, '×', close.x + close.width / 2, close.y + close.height / 2 - 1,
        { size: 29, color: DARK_WOOD });
    }
    if (this.assets.refresh?.ready) {
      const angle = this.input.activeId === 'friends:refresh' ? -0.22 : Math.sin(elapsed * 1.8) * 0.055;
      ctx.save();
      ctx.translate(refreshButton.x + refreshButton.width / 2, refreshButton.y + refreshButton.height / 2);
      ctx.rotate(angle);
      ctx.drawImage(this.assets.refresh.image, -refreshButton.width / 2, -refreshButton.height / 2,
        refreshButton.width, refreshButton.height);
      ctx.restore();
    } else if (refreshButton) {
      text(ctx, '刷新', refreshButton.x + refreshButton.width / 2,
        refreshButton.y + refreshButton.height / 2,
        { size: 14, color: '#FFF5CE', outline: 2 });
    }
    if (isWorld && this.controller.worldBoard.state === 'loading' && this.controller.worldBoard.rows.length) {
      panel(ctx, x, y + 30, boardWidth, boardHeight - 31,
        { fill: 'rgba(73, 47, 32, 0.42)', lineWidth: 0, radius: 10 });
      text(ctx, '正在刷新…', 207, y + boardHeight / 2,
        { size: 24, color: '#FFFFFF', outline: 3, font: getHomeFont() });
    }
    if (isWorld && this.controller.worldBoard.state === 'error' && this.controller.worldBoard.rows.length) {
      panel(ctx, x + 30, y + boardHeight - 66, boardWidth - 60, 42,
        { fill: '#FFF2CE', stroke: '#B85E2A', lineWidth: 2, radius: 13 });
      text(ctx, '刷新失败，请重试', 207, y + boardHeight - 45,
        { size: 16, color: INK, font: getHomeFont() });
    }
  }

  drawWorldBoard(ctx, x, y, width, height) {
    let board = this.controller.worldBoard;
    if (board.state === 'idle') {
      this.controller.loadWorldLeaderboard();
      board = this.controller.worldBoard;
    }
    if ((board.state === 'idle' || board.state === 'loading') && !board.rows.length) {
      text(ctx, '正在获取世界排名…', x + width / 2, y + height / 2,
        { size: 17, color: DARK_WOOD, font: getHomeFont() });
      return;
    }
    if (board.state === 'error' && !board.rows.length) {
      text(ctx, '世界榜暂时加载失败', x + width / 2, y + height / 2 - 13,
        { size: 17, color: DARK_WOOD, font: getHomeFont() });
      text(ctx, '点击右上角刷新重试', x + width / 2, y + height / 2 + 20,
        { size: 12, color: '#8C674C' });
      return;
    }
    if (!board.rows.length) {
      if (this.rankingEmpty?.ready) ctx.drawImage(this.rankingEmpty.image,
        x + 22, y + 54, width - 44, Math.min(220, height - 125));
      text(ctx, '还没有世界榜成绩', x + width / 2, y + height / 2 - 13,
        { size: 17, color: DARK_WOOD, font: getHomeFont() });
      text(ctx, '完成一关后就会出现在这里', x + width / 2, y + height / 2 + 20,
        { size: 12, color: '#8C674C' });
      return;
    }

    const headerHeight = 36;
    const rowHeight = 75;
    const viewHeight = height - headerHeight;
    const maxScroll = Math.max(0, board.rows.length * rowHeight - viewHeight);
    this.worldScrollY = Math.max(0, Math.min(maxScroll, this.worldScrollY));
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y + headerHeight, width, viewHeight);
    ctx.clip();
    board.rows.forEach((row, index) => {
      const rowY = y + headerHeight + index * rowHeight - this.worldScrollY;
      if (rowY + rowHeight < y + headerHeight || rowY > y + height) return;
      panel(ctx, x + 1, rowY + 2, width - 4, rowHeight - 5, {
        fill: row.isMe ? '#E0F9D7' : row.rank === 1 ? '#FFF0BC' : '#FFF8E9',
        stroke: row.isMe ? '#5ED866' : '#EEC997',
        lineWidth: row.isMe ? 2 : 1,
        radius: 13,
      });
      const cy = rowY + rowHeight / 2;
      if (row.rank <= 3) {
        const medal = this.medals[row.rank - 1];
        if (medal?.ready) ctx.drawImage(medal.image, x + 9, cy - 24, 48, 48);
        else circle(ctx, x + 33, cy, 24, ['#FFC832', '#BDD7EA', '#DCA06E'][row.rank - 1], 3, '#934716');
      }
      if (row.rank > 3 || !this.medals[row.rank - 1]?.ready) text(ctx, String(row.rank), x + 33, cy,
        { size: row.rank <= 3 ? 22 : 23, color: row.isMe ? '#14662A' : INK, font: getHomeFont() });
      this.drawWorldAvatar(ctx, row, x + 91, cy, 24);
      ctx.font = `bold 16px ${getHomeFont()}`;
      text(ctx, fitName(ctx, row.isMe ? '我' : row.nickname, 104), x + 130, cy,
        { size: 16, color: row.isMe ? '#14662A' : INK, align: 'left', font: getHomeFont() });
      star(ctx, x + width - 79, cy, 12);
      text(ctx, String(row.completed), x + width - 15, cy,
        { size: 22, color: row.isMe ? '#14662A' : INK, align: 'right', font: getHomeFont() });
    });
    ctx.restore();
  }

  drawWorldAvatar(ctx, row, centerX, centerY, radius) {
    let entry = this.worldAvatars.get(row.avatarUrl);
    if (row.avatarUrl && !entry && this.controller.platform.createImage) {
      entry = { image: this.controller.platform.createImage(), ready: false, failed: false };
      entry.image.onload = () => { entry.ready = true; };
      entry.image.onerror = () => { entry.failed = true; };
      entry.image.src = row.avatarUrl;
      this.worldAvatars.set(row.avatarUrl, entry);
    }
    ctx.save();
    panel(ctx, centerX - radius, centerY - radius, radius * 2, radius * 2,
      { fill: '#E2C899', stroke: '#FFFFFF', lineWidth: 2, radius: 11 });
    ctx.beginPath();
    ctx.roundRect(centerX - radius + 2, centerY - radius + 2,
      radius * 2 - 4, radius * 2 - 4, 9);
    ctx.clip();
    if (entry?.ready) ctx.drawImage(entry.image, centerX - radius, centerY - radius, radius * 2, radius * 2);
    else {
      ctx.fillStyle = '#D8EFCB';
      ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
      text(ctx, Array.from(row.nickname)[0] || '玩', centerX, centerY,
        { size: 16, color: '#517E39' });
    }
    ctx.restore();
  }

  drawTabs(ctx) {
    for (const button of this.buttons.filter((item) => item.id.startsWith('friends:tab-'))) {
      const active = button.id === `friends:tab-${this.controller.friendsTab}`;
      const { x, y, width, height } = button;
      panel(ctx, x, y, width, height, {
        fill: active ? '#FFD43B' : '#FFE6BF', stroke: '#A34B18',
        lineWidth: 2, radius: 15, shadow: '#C68B45', offset: 2,
      });
      text(ctx, button.label, x + width / 2, y + height / 2,
        { size: 21, color: INK, outline: 1, font: getHomeFont() });
    }
  }

  scrollBy(delta) {
    if (Math.abs(delta) < 1) return;
    if (this.controller.friendsTab === 'world') this.worldScrollY += delta;
    else this.controller.platform.friendBoard?.send('scroll', { delta });
  }

  handlePointer(type, point) {
    if (type === 'cancel') {
      this.swipe = null;
      super.handlePointer(type, point);
      return;
    }
    if (type === 'start' && contains(this.bounds, point)) {
      this.swipe = { id: point.id, y: point.y };
      return;
    }
    if (this.swipe && point.id === this.swipe.id) {
      if (type === 'move' || type === 'end') {
        this.scrollBy(this.swipe.y - point.y);
        this.swipe.y = point.y;
        if (type === 'end') this.swipe = null;
      }
      return;
    }
    super.handlePointer(type, point);
  }

  pause() {
    this.swipe = null;
    super.pause();
  }
}
