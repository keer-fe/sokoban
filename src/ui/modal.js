import { Screen, stars } from './screen.js';
import { circle, line, panel, text } from './draw.js';
import { illustration } from './illustrations.js';
import { theme } from './theme.js';
import { getHomeFont } from './home-font.js';
import { leaderboardCloseFileID, leaderboardCloseSource } from './leaderboard-assets.js';
import { cloudImageFileID, cloudUIFileID, publicImageSource, publicUISource } from './cloud-assets.js';

const WOOD = '#A85E2E';
const DARK_WOOD = '#4A2716';
const GOLD = '#FFD15E';
const PAPER = '#FFF2C7';
const GREEN = '#55B941';
export const settingsPanelSource = publicUISource('settings-panel-v1.png');
export const settingsPanelFileID = cloudUIFileID('settings-panel-v1.png');
export const settingIconSources = Object.freeze({
  music: publicImageSource('generated/game-controls-v1/music-v1.png'),
  sound: publicImageSource('generated/game-controls-v1/sound-v1.png'),
  vibration: publicImageSource('generated/game-controls-v1/vibration-v1.png'),
});
export const settingIconFileIDs = Object.freeze({
  music: cloudImageFileID('generated/game-controls-v1/music-v1.png'),
  sound: cloudImageFileID('generated/game-controls-v1/sound-v1.png'),
  vibration: cloudImageFileID('generated/game-controls-v1/vibration-v1.png'),
});

export class Modal extends Screen {
  constructor(controller, onAction) {
    super(controller, onAction);
    this.settingsPanel = null;
    this.closeButton = null;
    this.settingIcons = {};
    if (controller.platform.createImage) {
      const image = controller.platform.createImage();
      this.settingsPanel = { image, ready: false };
      image.onload = () => { this.settingsPanel.ready = true; };
      image.onerror = () => {
        this.settingsPanel.ready = false;
        if (image.src !== settingsPanelSource) image.src = settingsPanelSource;
      };
      if (controller.platform.resolveCloudFiles) {
        controller.platform.resolveCloudFiles({ panel: settingsPanelFileID })
          .then(({ panel }) => { image.src = panel; })
          .catch(() => { image.src = settingsPanelSource; });
      } else image.src = settingsPanelSource;

      const closeImage = controller.platform.createImage();
      this.closeButton = { image: closeImage, ready: false };
      closeImage.onload = () => { this.closeButton.ready = true; };
      closeImage.onerror = () => {
        this.closeButton.ready = false;
        if (closeImage.src !== leaderboardCloseSource) closeImage.src = leaderboardCloseSource;
      };
      if (controller.platform.resolveCloudFiles) {
        controller.platform.resolveCloudFiles({ close: leaderboardCloseFileID })
          .then(({ close }) => { closeImage.src = close; })
          .catch(() => { closeImage.src = leaderboardCloseSource; });
      } else closeImage.src = leaderboardCloseSource;

      Object.entries(settingIconSources).forEach(([name, source]) => {
        const iconImage = controller.platform.createImage();
        const entry = { image: iconImage, ready: false };
        this.settingIcons[name] = entry;
        iconImage.onload = () => { entry.ready = true; };
        iconImage.onerror = () => { entry.ready = false; };
        iconImage.src = source;
      });
      if (controller.platform.resolveCloudFiles) {
        controller.platform.resolveCloudFiles(settingIconFileIDs)
          .then((sources) => Object.entries(sources).forEach(([name, source]) => {
            if (this.settingIcons[name]) this.settingIcons[name].image.src = source;
          }))
          .catch((error) => console.warn('Cloud setting icons failed to resolve.', error));
      }
    }
  }

  layout() {
    const c = this.controller;
    const height = c.modal === 'win' ? 700 : c.modal === 'menu' || c.modal === 'settings' ? 470 : 540;
    this.top = this.viewport.safeTop + Math.max(24,
      (this.viewport.height - this.viewport.safeTop - this.viewport.safeBottom - height) / 2);
    const y = this.top;
    const button = (id, label, row, options = {}) => ({ id, label, x: 59, y: y + 226 + row * 64,
      width: 296, height: 50, icon: false, ...options });
    this.buttons = [];
    if (c.modal === 'profile') this.buttons = [
      button('authorize-profile', '同意并进入游戏', 1, { primary: true }),
    ];
    if (c.modal === 'deadlock') this.buttons = [
      button('undo', '撤销一步（1 张卡）', 1, { primary: true }),
      button('restart', '重新开始', 2), button('close', '返回棋盘', 3)];
    if (c.modal === 'menu') this.buttons = [
      button('music', '', 0, { x: 74, y: y + 98, width: 266, height: 48 }),
      button('sound', '', 1, { x: 74, y: y + 154, width: 266, height: 48 }),
      button('vibration', '', 2, { x: 74, y: y + 210, width: 266, height: 48 }),
      button('restart', '重新开始', 3, { x: 74, y: y + 282, width: 126, height: 48 }),
      button('give-up', '放弃挑战', 4, { x: 214, y: y + 282, width: 126, height: 48 }),
    ];
    if (c.modal === 'settings') this.buttons = [
      button('music', '', 0, { x: 74, y: y + 118, width: 266, height: 58 }),
      button('sound', '', 1, { x: 74, y: y + 186, width: 266, height: 58, disabled: true }),
      button('vibration', '', 2, { x: 74, y: y + 254, width: 266, height: 58, disabled: true }),
    ];
    if (c.modal === 'win') this.buttons = [button(c.nextLevelIndex() === null ? 'levels' : 'next',
      c.nextLevelIndex() === null ? '返回选关' : '下一关', 0, { y: y + 494, primary: true }),
    button('retry', '再玩一次', 0, { y: y + 554, width: 142 }),
    button('replay-current', '回放本次', 0, { y: y + 554, x: 213, width: 142 }),
    button('levels', '返回选关', 0, { y: y + 614 }),
    ...[['level-previous', '上一页'], ['level-refresh', '刷新'], ['level-next', '下一页']].map(([id, label], i) =>
      ({ id, label, x: 59 + i * 102, y: y + 458, width: 92, height: 28, fontSize: 12 }))];
    if (c.modal === 'tutorial') this.buttons = [button('understood', '开始尝试', 1, { primary: true }), button('skip', '跳过引导', 2)];
    if (c.modal === 'cards') this.buttons = [button('ad', '广告暂未开放', 1, { disabled: true }),
      button('close', '取消', 2)];
    if (c.modal === 'pk-choice') this.buttons = [
      button('pk-create', '创建房间', 1, { primary: true }), button('pk-join', '输入房间码加入', 2),
      button('levels', '返回模式选择', 3)];
    if (c.modal === 'pk-room') {
      const coop = c.pk.room.mode === 'coop';
      const playersReady = c.pk.room.players.length === 2
        && c.pk.room.players.every(player => player.ready);
      this.buttons = [
        button('pk-ready-toggle', c.pk.room.me.ready ? '取消准备' : '准备', 0,
          { y: y + 310, primary: !c.pk.room.me.ready }),
        ...(c.pk.room.me.isHost ? [button('pk-start-match', coop ? '开始合作' : '开始 PK', 0,
          { y: y + 368, primary: playersReady, disabled: !playersReady })] : []),
        button('pk-share', '邀请好友', 0, { y: y + 426, width: 142 }),
        button('levels', '退出房间', 0, { y: y + 426, x: 213, width: 142 }),
      ];
    }
    if (c.modal === 'pk-countdown') this.buttons = [];
    if (c.modal === 'pk-finished') this.buttons = [button('levels', '退出房间', 3)];
    if (c.modal === 'pk-result') this.buttons = [
      button('pk-restart', '再来一局', 1, { primary: true }), button('levels', '返回模式选择', 2)];
    if (c.modal === 'pk-cancelled') this.buttons = [button('levels', '返回模式选择', 2, { primary: true })];
  }
  render(ctx) {
    this.layout();
    const c = this.controller;
    const top = this.top;
    ctx.fillStyle = c.modal === 'menu' || c.modal === 'settings'
      ? 'rgba(18, 43, 43, 0.52)'
      : 'rgba(0,0,0,0.7)';
    // Cover the full physical viewport, including any horizontal letterboxing.
    const extra = this.viewport.offsetX / this.viewport.scale;
    ctx.fillRect(-extra, 0, 414 + extra * 2, this.viewport.height);
    if (c.modal === 'menu' || c.modal === 'settings') {
      this.renderGameMenu(ctx);
      return;
    }
    panel(ctx, 37, top, 340, c.modal === 'win' ? 680 : 520, { fill: theme.sky, radius: 10, lineWidth: 5, shadow: theme.ink, offset: 7 });
    for (let i = 0; i < 8; i += 1) panel(ctx, 41 + i * 41.5, top + 3, 41.5, 13,
      { fill: theme.brick, lineWidth: 2, radius: 0 });
    const coop = c.roomMode === 'coop' || c.pk?.room?.mode === 'coop';
    const titles = { menu: '休息一下', settings: '游戏设置', win: '太棒了！', tutorial: '推箱子小课堂', cards: '撤销卡不足', deadlock: '箱子卡住了', profile: '完善玩家资料', 'pk-choice': coop ? '双人合作闯关' : '在线双人 PK', 'pk-loading': '正在连接', 'pk-room': '等待好友', 'pk-countdown': coop ? '准备合作' : '准备开赛', 'pk-finished': '已完成挑战', 'pk-result': coop ? '合作成功' : '对战结果', 'pk-cancelled': '房间已结束' };
    illustration(ctx, c.modal === 'win' ? 'done' : 'crate', 181, top + 35, 52);
    text(ctx, titles[c.modal], 207, top + 118, { size: 28, color: theme.yellow, outline: 2 });
    const caption = (value, offset, options = {}) => text(ctx, value, 207, top + offset,
      { size: 15, color: theme.white, ...options });
    if (c.modal === 'profile') {
      caption('一次授权，后续不再重复询问', 173);
      caption('用于在好友榜和世界榜展示', 211, { size: 13 });
      caption('你的头像、昵称和闯关成绩', 243, { size: 13 });
    } else if (c.modal === 'deadlock') {
      caption('有箱子已无法推到目标格', 173);
      caption('可以撤销刚才的一步，或重新开始', 211, { size: 13 });
      caption(`当前拥有 ${c.progress.state.cards} 张撤销卡`, 249, { size: 13 });
    } else if (c.modal === 'menu') {
      caption(`第 ${c.campaignLevelNumber()} 关 · ${c.game.state.steps} 步`, 165);
      caption('好好想一想，答案就在下一步', 195, { size: 13 });
      caption('音乐与音效资源即将上线', 490, { size: 12 });
    } else if (c.modal === 'win') {
      caption(`第 ${c.campaignLevelNumber()} 关完成`, 157);
      if (c.result.stars) stars(ctx, c.result.stars, 140, top + 182, 38, 10);
      else caption('挑战完成！', 206, { size: 24, color: theme.yellow });
      const record = c.progress.state.records[c.game.level.id];
      caption(`本次 ${c.result.steps} 步  ·  最佳 ${record ? record.bestSteps : c.result.steps} 步`, 247);
      panel(ctx, 57, top + 272, 300, 180, { fill: theme.white, lineWidth: 0 });
      const bridge = c.platform.friendBoard;
      if (bridge && bridge.available && bridge.canvas && !bridge.demo) {
        ctx.drawImage(bridge.canvas, 57, top + 272, 300, 180);
      } else {
        caption('本关好友步数榜', 320, { color: theme.ink });
        caption('请在微信小游戏中查看', 359, { size: 13, color: theme.ink });
      }
      if (!c.result.saved) caption('记录保存失败，请检查存储空间', 675, { size: 10 });
    } else if (c.modal === 'tutorial') {
      caption('点击方向键，每次移动一格', 173);
      caption('箱子只能推，不能拉', 208);
      caption('箱子到达四角标记的目标格即可通关', 243, { size: 14 });
    } else if (c.modal === 'cards') {
      caption('观看广告获得 3 张撤销卡', 176);
      caption('功能暂未开放', 217, { size: 13 });
    } else if (c.modal === 'pk-choice') {
      caption('创建房间并邀请微信好友', 173);
      caption(coop ? '好友加入后，共同操作同一个棋盘' : '好友加入后，双方同时挑战同一关', 211, { size: 13 });
      caption(coop ? '每一步实时同步，一起把箱子推到终点' : '步数更少者获胜，用时用于打破平局', 249, { size: 13 });
    } else if (c.modal === 'pk-loading') {
      caption('正在连接 PK 房间…', 193, { size: 18 });
      caption('请稍候', 231, { size: 13 });
    } else if (c.modal === 'pk-room') {
      caption(`房间码　${c.pk.room.code}`, 178, { size: 24, color: theme.yellow, outline: 1 });
      const [first, second] = c.pk.room.players;
      caption(`玩家 1　${first?.ready ? '已准备' : '未准备'}`, 218,
        { color: first?.ready ? theme.yellow : theme.white });
      caption(`玩家 2　${second ? (second.ready ? '已准备' : '未准备') : '等待加入'}`, 250,
        { color: second?.ready ? theme.yellow : theme.white });
      caption(c.pk.room.me.isHost ? `双方准备后，由房主开始${coop ? '闯关' : '比赛'}` : '准备后等待房主开始', 286, { size: 13 });
    } else if (c.modal === 'pk-countdown') {
      const remaining = Math.max(1, Math.ceil((c.pk.room.startAt
        - (c.now() + (c.pk.serverOffset || 0))) / 1000));
      caption(String(remaining), 201, { size: 64, color: theme.yellow, outline: 2 });
      caption(coop ? '同一个棋盘即将开启' : '双方将在同一时间开始', 267, { size: 15 });
    } else if (c.modal === 'pk-finished') {
      const me = c.pk.room.me;
      caption(me?.result ? `你的成绩：${me.result.steps} 步 · ${formatPkTime(me.result.elapsedMs)}` : '正在提交成绩…', 183);
      caption('等待对手完成挑战', 225, { size: 18, color: theme.yellow });
      caption('请保持小游戏在前台', 261, { size: 13 });
    } else if (c.modal === 'pk-result') {
      const room = c.pk.room;
      const [first, second] = room.players;
      if (coop) {
        caption('你们一起完成了挑战！', 173, { size: 24, color: theme.yellow, outline: 1 });
        caption(`共同完成　${c.game.state.steps} 步`, 218);
        caption(`最后一步由玩家 ${room.completedBy || '-'} 完成`, 254);
      } else {
        caption(room.winner ? `${room.winner === room.me.seat ? '你' : '对手'}获胜！` : '平局！', 173,
          { size: 24, color: theme.yellow, outline: 1 });
        caption(`玩家 1　${first.result.steps} 步 · ${formatPkTime(first.result.elapsedMs)}`, 218);
        caption(`玩家 2　${second.result.steps} 步 · ${formatPkTime(second.result.elapsedMs)}`, 254);
      }
    } else if (c.modal === 'pk-cancelled') {
      caption('另一名玩家已退出，或房间已过期', 193);
      caption('返回后可以重新创建房间', 231, { size: 13 });
    }
    this.drawButtons(ctx);
  }

  renderGameMenu(ctx) {
    const c = this.controller;
    const top = this.top;
    const illustratedPanel = this.settingsPanel?.ready;
    if (illustratedPanel) ctx.drawImage(this.settingsPanel.image, 27, top, 360, 450);
    else {
      panel(ctx, 27, top, 360, 450,
        { fill: WOOD, stroke: DARK_WOOD, lineWidth: 5, radius: 22, shadow: DARK_WOOD, offset: 7 });
      panel(ctx, 98, top + 8, 218, 62,
        { fill: '#C97828', stroke: DARK_WOOD, lineWidth: 4, radius: 18 });
    }
    text(ctx, c.modal === 'menu' ? '暂停菜单' : '游戏设置', 207,
      top + 51,
      { size: 34, color: '#FFF2B5', outline: 5, font: getHomeFont(), spacing: 2 });
    if (!illustratedPanel) panel(ctx, 49, top + 82, 316, 286,
      { fill: PAPER, stroke: DARK_WOOD, lineWidth: 4, radius: 18, shadow: '#6D391E', offset: 4 });

    this.drawCloseButton(ctx, top);
    if (c.modal === 'menu') this.drawPauseMenu(ctx, top);
    else this.drawSettings(ctx, top);
  }

  drawCloseButton(ctx, top) {
    const pressed = this.input.activeId === 'dismiss';
    const baseX = 326;
    const size = 44;
    const x = baseX + (pressed ? 3 : 0);
    const baseY = top + 14;
    const y = baseY + (pressed ? 3 : 0);
    if (this.closeButton?.ready) ctx.drawImage(this.closeButton.image, x, y, size, size);
    else {
      circle(ctx, x + size / 2, y + size / 2, size / 2 - 2, GOLD, 4, DARK_WOOD);
      text(ctx, '×', x + size / 2, y + size / 2 - 1,
        { size: 27, color: DARK_WOOD, font: getHomeFont() });
    }
    if (!this.buttons.some(button => button.id === 'dismiss')) {
      this.buttons.push({ id: 'dismiss', label: '', x: baseX, y: baseY, width: size, height: size });
    }
  }

  drawPauseMenu(ctx, top) {
    this.drawSettings(ctx, top);
    this.buttons.filter(button => ['restart', 'give-up'].includes(button.id))
      .forEach(button => this.drawMenuButton(ctx, button));
  }

  drawMenuButton(ctx, button) {
    const pressed = this.input.activeId === button.id;
    const shift = pressed ? 4 : 0;
    const primary = button.id === 'close';
    const restart = button.id === 'restart';
    const giveUp = button.id === 'give-up';
    const filled = primary || restart || giveUp;
    const fill = primary || restart ? GREEN : giveUp ? '#E76D43' : '#FFE6A5';
    const shadow = primary || restart ? '#2F7E31' : giveUp ? '#A8442E' : '#C68B45';
    panel(ctx, button.x + shift, button.y + shift, button.width, button.height, {
      fill, stroke: DARK_WOOD, lineWidth: 3, radius: 13,
      shadow: pressed ? null : shadow, offset: 4,
    });
    const iconX = button.x + shift + (button.width > 200 ? 37 : 27);
    const iconY = button.y + shift + button.height / 2;
    const icon = button.id === 'close' && button.label === '返回菜单' ? 'back' : button.id;
    this.drawMenuIcon(ctx, icon, iconX, iconY, filled ? '#FFF8D5' : DARK_WOOD);
    text(ctx, button.label, button.x + shift + button.width / 2 + 10,
      button.y + shift + button.height / 2,
      { size: button.width < 180 ? 15 : 18, color: filled ? '#FFF8D5' : DARK_WOOD,
        outline: filled ? 2 : 0, font: getHomeFont() });
  }

  drawMenuIcon(ctx, id, x, y, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (id === 'back') {
      line(ctx, [[x + 8, y - 9], [x - 4, y], [x + 8, y + 9]], color, 4);
    } else if (id === 'done') {
      line(ctx, [[x - 8, y], [x - 2, y + 7], [x + 10, y - 8]], color, 4);
    } else if (id === 'close') {
      ctx.beginPath(); ctx.moveTo(x - 5, y - 9); ctx.lineTo(x + 8, y); ctx.lineTo(x - 5, y + 9); ctx.closePath(); ctx.fill();
    } else if (id === 'restart' || id === 'replay-saved') {
      ctx.beginPath(); ctx.arc(x, y, 9, -Math.PI * 0.75, Math.PI * 0.9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 9, y - 8); ctx.lineTo(x - 10, y + 1); ctx.lineTo(x - 2, y - 3); ctx.fill();
    } else if (id === 'levels') {
      [[-7, -7], [3, -7], [-7, 3], [3, 3]].forEach(([dx, dy]) => ctx.fillRect(x + dx, y + dy, 7, 7));
    } else if (id === 'give-up') {
      line(ctx, [[x + 8, y - 9], [x - 4, y], [x + 8, y + 9]], color, 4);
    } else {
      line(ctx, [[x - 9, y - 7], [x + 9, y - 7]], color, 3);
      line(ctx, [[x - 9, y], [x + 9, y]], color, 3);
      line(ctx, [[x - 9, y + 7], [x + 9, y + 7]], color, 3);
      circle(ctx, x - 2, y - 7, 4, color); circle(ctx, x + 5, y, 4, color); circle(ctx, x - 5, y + 7, 4, color);
    }
    ctx.restore();
  }

  drawSettings(ctx, top) {
    for (const button of this.buttons.filter(item => ['music', 'sound', 'vibration'].includes(item.id))) {
      const active = cState(this.controller, button.id);
      const disabled = button.disabled;
      const pressed = !disabled && this.input.activeId === button.id;
      const shift = pressed ? 3 : 0;
      const centerY = button.y + button.height / 2 + shift;
      panel(ctx, button.x + shift, button.y + shift, button.width, button.height, {
        fill: disabled ? '#E7DDC7' : '#FFF9E5', stroke: disabled ? '#A9967F' : DARK_WOOD, lineWidth: 3, radius: 14,
        shadow: pressed ? null : '#D2A75B', offset: 3,
      });
      this.drawSettingIcon(ctx, button.id, button.x + 30 + shift, centerY, active, disabled);
      const labels = { music: '背景音乐', sound: '游戏音效', vibration: '震动反馈' };
      text(ctx, labels[button.id], button.x + 58 + shift,
        centerY, { size: 18, color: disabled ? '#8C7C6D' : DARK_WOOD, align: 'left', font: getHomeFont() });
      if (disabled) text(ctx, '暂未开放', button.x + 220, centerY,
        { size: 12, color: '#8C7C6D', font: getHomeFont() });
      else this.drawToggle(ctx, button.x + 191 + shift,
        button.y + (button.height - 34) / 2 + shift, active);
    }
  }

  drawToggle(ctx, x, y, active) {
    panel(ctx, x, y, 58, 34, { fill: active ? GREEN : '#B8A991', stroke: DARK_WOOD, lineWidth: 3, radius: 17 });
    circle(ctx, x + (active ? 41 : 17), y + 17, 12, '#FFF9E5', 2, DARK_WOOD);
  }

  drawSettingIcon(ctx, id, x, y, active, disabled = false) {
    const asset = this.settingIcons[id];
    if (asset?.ready) {
      ctx.save();
      ctx.globalAlpha = disabled ? 0.35 : active ? 1 : 0.58;
      ctx.drawImage(asset.image, x - 21, y - 21, 42, 42);
      ctx.restore();
      return;
    }
    const color = active ? '#3D9634' : '#9B8064';
    ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
    if (id === 'music') {
      line(ctx, [[x + 2, y - 13], [x + 2, y + 7]], color, 3);
      line(ctx, [[x + 2, y - 13], [x + 13, y - 16], [x + 13, y + 4]], color, 3);
      circle(ctx, x - 3, y + 10, 6, color); circle(ctx, x + 8, y + 7, 6, color);
    } else if (id === 'sound') {
      ctx.beginPath(); ctx.moveTo(x - 14, y - 6); ctx.lineTo(x - 7, y - 6); ctx.lineTo(x + 2, y - 14);
      ctx.lineTo(x + 2, y + 14); ctx.lineTo(x - 7, y + 6); ctx.lineTo(x - 14, y + 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 3, y, 10, -0.8, 0.8); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 3, y, 16, -0.7, 0.7); ctx.stroke();
    } else {
      panel(ctx, x - 8, y - 14, 16, 28, { fill: color, stroke: color, lineWidth: 2, radius: 4 });
      line(ctx, [[x - 13, y - 9], [x - 17, y - 5], [x - 17, y + 5], [x - 13, y + 9]], color, 2);
      line(ctx, [[x + 13, y - 9], [x + 17, y - 5], [x + 17, y + 5], [x + 13, y + 9]], color, 2);
    }
    ctx.restore();
  }
}

function cState(controller, id) { return Boolean(controller.progress.state[id]); }

function formatPkTime(milliseconds) {
  const tenths = Math.floor(Math.max(0, milliseconds) / 100);
  return `${Math.floor(tenths / 10)}.${tenths % 10} 秒`;
}
