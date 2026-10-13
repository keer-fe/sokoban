import { Screen, stars } from './screen.js';
import { panel, text } from './draw.js';
import { illustration } from './illustrations.js';
import { theme } from './theme.js';

export class Modal extends Screen {
  layout() {
    const c = this.controller;
    const height = c.modal === 'win' ? 700 : 540;
    this.top = this.viewport.safeTop + Math.max(24,
      (this.viewport.height - this.viewport.safeTop - this.viewport.safeBottom - height) / 2);
    const y = this.top;
    const button = (id, label, row, options = {}) => ({ id, label, x: 59, y: y + 226 + row * 64,
      width: 296, height: 50, icon: false, ...options });
    this.buttons = [];
    if (c.modal === 'deadlock') this.buttons = [
      button('undo', '撤销一步（1 张卡）', 1, { primary: true }),
      button('restart', '重新开始', 2), button('close', '返回棋盘', 3)];
    if (c.modal === 'menu') this.buttons = [button('close', '继续游戏', 0, { primary: true }),
      button('restart', '重新开始', 1), button('levels', '返回选关', 2),
      { ...button('music', `音乐 ${c.progress.state.music ? '开' : '关'}`, 3), width: 142 },
      { ...button('sound', `音效 ${c.progress.state.sound ? '开' : '关'}`, 3), x: 213, width: 142 }];
    if (c.modal === 'menu' && c.progress.state.solutions[c.game.level.id]) {
      this.buttons[1].width = 142;
      this.buttons.push(button('replay-saved', '已存解法', 1, { x: 213, width: 142, fontSize: 16 }));
    }
    if (c.modal === 'win') this.buttons = [button(c.levelIndex === c.levels.length - 1 ? 'home' : 'next',
      c.levelIndex === c.levels.length - 1 ? '返回首页' : '下一关', 0, { y: y + 494, primary: true }),
    button('retry', '再玩一次', 0, { y: y + 554, width: 142 }),
    button('replay-current', '回放本次', 0, { y: y + 554, x: 213, width: 142 }),
    button('levels', '返回选关', 0, { y: y + 614 }),
    ...[['level-previous', '上一页'], ['level-refresh', '刷新'], ['level-next', '下一页']].map(([id, label], i) =>
      ({ id, label, x: 59 + i * 102, y: y + 458, width: 92, height: 28, fontSize: 12 }))];
    if (c.modal === 'tutorial') this.buttons = [button('understood', '开始尝试', 1, { primary: true }), button('skip', '跳过引导', 2)];
    if (c.modal === 'signin') this.buttons = [button('claim', c.progress.canSignIn(c.now()) ? '领取 5 张撤销卡' : '今日已领取', 1,
      { primary: true, disabled: !c.progress.canSignIn(c.now()) }), button('close', '返回', 2)];
    if (c.modal === 'cards') this.buttons = [button('ad', '广告暂未开放', 1, { disabled: true }),
      button('signin', '前往每日签到', 2, { primary: true }), button('close', '取消', 3)];
  }
  render(ctx) {
    this.layout();
    const c = this.controller;
    const top = this.top;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    // Cover the full physical viewport, including any horizontal letterboxing.
    const extra = this.viewport.offsetX / this.viewport.scale;
    ctx.fillRect(-extra, 0, 414 + extra * 2, this.viewport.height);
    panel(ctx, 37, top, 340, c.modal === 'win' ? 680 : 520, { fill: theme.sky, radius: 10, lineWidth: 5, shadow: theme.ink, offset: 7 });
    for (let i = 0; i < 8; i += 1) panel(ctx, 41 + i * 41.5, top + 3, 41.5, 13,
      { fill: theme.brick, lineWidth: 2, radius: 0 });
    const titles = { menu: '休息一下', win: '太棒了！', tutorial: '推箱子小课堂', signin: '每日签到', cards: '撤销卡不足', deadlock: '箱子卡住了' };
    illustration(ctx, c.modal === 'win' ? 'done' : c.modal === 'signin' ? 'question' : 'crate', 181, top + 35, 52);
    text(ctx, titles[c.modal], 207, top + 118, { size: 28, color: theme.yellow, outline: 2 });
    const caption = (value, offset, options = {}) => text(ctx, value, 207, top + offset,
      { size: 15, color: theme.white, ...options });
    if (c.modal === 'deadlock') {
      caption('有箱子已无法推到目标格', 173);
      caption('可以撤销刚才的一步，或重新开始', 211, { size: 13 });
      caption(`当前拥有 ${c.progress.state.cards} 张撤销卡`, 249, { size: 13 });
    } else if (c.modal === 'menu') {
      caption(`第 ${c.levelIndex + 1} 关 · ${c.game.state.steps} 步`, 165);
      caption('好好想一想，答案就在下一步', 195, { size: 13 });
      caption('音乐与音效资源即将上线', 490, { size: 12 });
    } else if (c.modal === 'win') {
      caption(`第 ${c.levelIndex + 1} 关完成`, 157);
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
    } else if (c.modal === 'signin') {
      caption('每天一份小礼物，解谜更从容', 169, { size: 13 });
      caption('+5 张撤销卡', 216, { size: 26, color: theme.yellow, outline: 1 });
      caption(`当前拥有 ${c.progress.state.cards} 张`, 255);
      caption('北京时间每日 0 点刷新', 461, { size: 12 });
    } else if (c.modal === 'cards') {
      caption('观看广告获得 3 张撤销卡', 176);
      caption('也可以通过每日签到免费领取', 217, { size: 13 });
      caption('领取后再次点击撤销即可使用', 249, { size: 13 });
    }
    this.drawButtons(ctx);
  }
}
