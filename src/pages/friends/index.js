import { Screen } from '../../ui/screen.js';
import { contains } from '../../ui/button.js';
import { circle, panel, text } from '../../ui/draw.js';
import { getHomeFont } from '../../ui/home-font.js';
import { leaderboardCloseFileID, leaderboardCloseSource } from '../../ui/leaderboard-assets.js';
import { cloudUIFileID, publicUISource } from '../../ui/cloud-assets.js';

const WOOD = '#A85E2E';
const DARK_WOOD = '#4A2716';
const GOLD = '#FFD15E';
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
    const safeTop = this.viewport.safeTop + 12;
    const bottom = this.viewport.height - this.viewport.safeBottom;
    const frameHeight = Math.min(842, bottom - safeTop - 12);
    const top = safeTop + Math.max(0, (bottom - safeTop - 12 - frameHeight) / 2);
    this.frame = { x: 18, y: top, width: 378, height: frameHeight };
    this.bounds = { x: 55, y: top + 184, width: 304, height: frameHeight - 288 };
    this.buttons = [
      { id: 'close', label: '×', x: 337, y: top + 18, width: 48, height: 48,
        fontSize: 29, fill: GOLD, color: DARK_WOOD },
      { id: 'friends:tab-friends', label: '好友榜', x: 58, y: top + 138, width: 88, height: 38 },
      { id: 'friends:tab-world', label: '世界榜', x: 152, y: top + 138, width: 88, height: 38 },
    ];
    this.buttons.push(
      { id: 'friends:refresh', label: '刷新', x: 303, y: top + 132, width: 52, height: 52,
        fontSize: 12, fill: '#FFE7A1', color: DARK_WOOD });
    const bridge = this.controller.platform.friendBoard;
    if (bridge) bridge.send('resize', { width: this.bounds.width, height: this.bounds.height,
      pixelRatio: Math.min(3, this.viewport.pixelRatio), fontFamily: getHomeFont() });
  }
  render(ctx, elapsed = 0) {
    const { width, height } = this.viewport;
    ctx.fillStyle = 'rgba(18, 43, 43, 0.52)';
    ctx.fillRect(0, 0, width, height);

    const { y: top, height: frameHeight } = this.frame;
    if (this.assets.panel?.ready) {
      ctx.drawImage(this.assets.panel.image, -2, top - 18, 418, frameHeight + 42);
    }
    else {
      panel(ctx, 18, top, 378, frameHeight,
        { fill: WOOD, stroke: DARK_WOOD, lineWidth: 5, radius: 22, shadow: DARK_WOOD, offset: 7 });
      panel(ctx, 89, top + 17, 236, 70,
        { fill: '#C97828', stroke: DARK_WOOD, lineWidth: 4, radius: 18 });
    }
    text(ctx, '排行榜', 207, top + 65,
      { size: 34, color: '#FFF2B5', outline: 5, font: getHomeFont(), spacing: 2 });
    const isWorld = this.controller.friendsTab === 'world';

    const { x, y, width: boardWidth, height: boardHeight } = this.bounds;
    this.drawTabs(ctx);
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
    text(ctx, '上下滑动 · 查看完整榜单', 207, top + frameHeight - 69,
      { size: 12, color: '#FFECC0', outline: 2, spacing: 1 });
  }

  drawWorldBoard(ctx, x, y, width, height) {
    let board = this.controller.worldBoard;
    if (board.state === 'idle') {
      this.controller.loadWorldLeaderboard();
      board = this.controller.worldBoard;
    }
    if (board.state === 'idle' || board.state === 'loading') {
      text(ctx, '正在获取世界排名…', x + width / 2, y + height / 2,
        { size: 17, color: DARK_WOOD, font: getHomeFont() });
      return;
    }
    if (board.state === 'error') {
      text(ctx, '世界榜暂时加载失败', x + width / 2, y + height / 2 - 13,
        { size: 17, color: DARK_WOOD, font: getHomeFont() });
      text(ctx, '点击右上角刷新重试', x + width / 2, y + height / 2 + 20,
        { size: 12, color: '#8C674C' });
      return;
    }
    if (!board.rows.length) {
      text(ctx, '还没有世界榜成绩', x + width / 2, y + height / 2 - 13,
        { size: 17, color: DARK_WOOD, font: getHomeFont() });
      text(ctx, '完成一关后就会出现在这里', x + width / 2, y + height / 2 + 20,
        { size: 12, color: '#8C674C' });
      return;
    }

    const headerHeight = 30;
    const rowHeight = 62;
    const viewHeight = height - headerHeight;
    const maxScroll = Math.max(0, board.rows.length * rowHeight - viewHeight);
    this.worldScrollY = Math.max(0, Math.min(maxScroll, this.worldScrollY));
    text(ctx, '排名', x + 18, y + 14, { size: 11, color: '#8C674C' });
    text(ctx, '玩家', x + 96, y + 14, { size: 11, color: '#8C674C' });
    text(ctx, '战绩', x + width - 20, y + 14, { size: 11, color: '#8C674C', align: 'right' });
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y + headerHeight, width, viewHeight);
    ctx.clip();
    board.rows.forEach((row, index) => {
      const rowY = y + headerHeight + index * rowHeight - this.worldScrollY;
      if (rowY + rowHeight < y + headerHeight || rowY > y + height) return;
      panel(ctx, x + 2, rowY + 3, width - 7, rowHeight - 7, {
        fill: row.isMe ? '#E5F6D8' : index % 2 ? '#FFFDF6' : '#FFF7E7',
        stroke: row.rank <= 3 ? ['#E9B640', '#AAB5A1', '#D69B67'][row.rank - 1] : '#E8D7B5',
        lineWidth: row.isMe ? 2 : 1,
        radius: 13,
      });
      const rankLabel = row.rank <= 3 ? ['🥇', '🥈', '🥉'][row.rank - 1] : `#${row.rank}`;
      text(ctx, rankLabel, x + 25, rowY + rowHeight / 2,
        { size: row.rank <= 3 ? 19 : 15, color: '#985322' });
      this.drawWorldAvatar(ctx, row, x + 65, rowY + rowHeight / 2, 18);
      text(ctx, row.isMe ? `（我）${row.nickname}` : row.nickname, x + 89, rowY + rowHeight / 2 - 8,
        { size: 13, color: DARK_WOOD, align: 'left' });
      text(ctx, `${row.totalStars} 星`, x + 89, rowY + rowHeight / 2 + 13,
        { size: 10, color: '#9A795C', align: 'left' });
      text(ctx, `${row.completed} 关`, x + width - 14, rowY + rowHeight / 2,
        { size: 17, color: '#2F8A3B', align: 'right', font: getHomeFont() });
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
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
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
        fill: active ? '#55B941' : '#FFE6A5', stroke: DARK_WOOD,
        lineWidth: 3, radius: 12, shadow: active ? '#2F7E31' : '#C68B45', offset: 3,
      });
      text(ctx, button.label, x + width / 2, y + height / 2,
        { size: 17, color: active ? '#FFF8D5' : DARK_WOOD,
          outline: active ? 2 : 0, font: getHomeFont() });
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
