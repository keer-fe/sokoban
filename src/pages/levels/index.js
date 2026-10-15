import { Screen, header, stars, lock } from '../../ui/screen.js';
import { panel, text } from '../../ui/draw.js';
import { drawButton } from '../../ui/button.js';
import { ground } from '../../ui/illustrations.js';
import { theme } from '../../ui/theme.js';

export class LevelsPage extends Screen {
  layout() {
    const c = this.controller;
    const top = this.viewport.safeTop + 20;
    this.top = top;
    const entries = c.campaignEntries();
    this.entries = entries.slice(c.listPage * 12, (c.listPage + 1) * 12);
    this.buttons = [{ id: 'home', label: '‹', x: 18, y: top, width: 44, height: 44, fontSize: 30 },
      { id: 'campaign:classic', label: '经典', x: 24, y: top + 87, width: 114, height: 46,
        fill: c.levelCampaign === 'classic' ? theme.yellow : theme.white },
      { id: 'campaign:adventure', label: '冒险', x: 150, y: top + 87, width: 114, height: 46,
        fill: c.levelCampaign === 'adventure' ? theme.yellow : theme.white },
      { id: 'campaign:coop', label: '双人合作', x: 276, y: top + 87, width: 114, height: 46,
        fill: c.levelCampaign === 'coop' ? theme.yellow : theme.white },
      ...this.entries.map(({ index }, i) => ({ id: `level:${index}`, label: '',
        x: 24 + (i % 4) * 94, y: top + 263 + Math.floor(i / 4) * 108, width: 82, height: 96 })),
    ];
    if (entries.length > 12) this.buttons.push(
      { id: 'previous', label: '上一页', x: 24, y: top + 603, width: 108, height: 46, disabled: c.listPage === 0 },
      { id: 'following', label: '下一页', x: 282, y: top + 603, width: 108, height: 46,
        disabled: (c.listPage + 1) * 12 >= entries.length });
  }
  render(ctx) {
    this.layout();
    const c = this.controller;
    const { top } = this;
    const campaignEntries = c.campaignEntries();
    const completed = campaignEntries.filter(({ level }) => c.progress.state.records[level.id]).length;
    const campaignNames = { classic: '经典模式', adventure: '冒险模式', coop: '双人合作' };
    const campaignName = campaignNames[c.levelCampaign];
    ground(ctx, 414, this.viewport.height, this.viewport.safeBottom);
    header(ctx, top, '选择模式', '经典推箱子 · 机关冒险');
    panel(ctx, 24, top + 151, 366, 60, { fill: theme.white, shadow: theme.ink });
    text(ctx, `${campaignName}进度`, 43, top + 169, { size: 13, align: 'left' });
    text(ctx, `${completed} / ${campaignEntries.length}`, 370, top + 169, { size: 13, align: 'right' });
    panel(ctx, 43, top + 188, 328, 9, { fill: '#DCE5F1', lineWidth: 0 });
    if (completed && campaignEntries.length) panel(ctx, 43, top + 188, 328 * completed / campaignEntries.length, 9,
      { fill: theme.green, lineWidth: 0 });
    text(ctx, c.levelCampaign === 'adventure' && campaignEntries.length ? '第一章 · 开门营业' : campaignName,
      25, top + 233, { size: 20, color: theme.white, outline: 1, align: 'left' });
    if (campaignEntries.length) text(ctx, `${c.listPage + 1} / ${Math.ceil(campaignEntries.length / 12)} 页`, 389, top + 233,
      { size: 14, color: theme.yellow, align: 'right' });
    this.buttons.forEach((button) => {
      if (!button.id.startsWith('level:')) drawButton(ctx, button, this.input.activeId === button.id);
      else {
        const index = Number(button.id.split(':')[1]);
        const locked = !c.campaignAvailable() || !c.progress.isUnlocked(index);
        const record = c.progress.state.records[c.levels[index].id];
        const fill = locked ? '#B8C6D9' : record ? '#52BD66' : theme.yellow;
        drawButton(ctx, { ...button, fill }, this.input.activeId === button.id);
        text(ctx, c.campaignLevelNumber(index), button.x + 41, button.y + 27,
          { size: 26, color: locked ? '#67768F' : theme.ink });
        text(ctx, c.levels[index].difficulty, button.x + 41, button.y + 52, { size: 13, color: theme.ink });
        if (locked) lock(ctx, button.x + 32, button.y + 68, 18);
        else if (record && !record.stars) text(ctx, '已通关', button.x + 41, button.y + 78, { size: 12 });
        else if (!c.levels[index].minSteps) text(ctx, '待评星', button.x + 41, button.y + 78, { size: 12 });
        else stars(ctx, record ? record.stars : 0, button.x + 12, button.y + 70, 16, 5);
      }
    });
    if (!campaignEntries.length) {
      panel(ctx, 24, top + 263, 366, 214, { fill: theme.white, shadow: theme.ink });
      text(ctx, c.levelCampaign === 'coop' ? '双人合作模式开发中' : '机关冒险正在搭建中',
        207, top + 325, { size: 23, color: theme.brick });
      text(ctx, c.levelCampaign === 'coop' ? '未来可以和伙伴一起推箱子' : '新关卡将在这里独立编号',
        207, top + 370, { size: 15 });
      text(ctx, c.levelCampaign === 'coop' ? '合作关卡，敬请期待'
        : c.campaignAvailable() ? '敬请期待第一章：开门营业' : '完成经典模式前 6 关即可解锁',
      207, top + 412, { size: 14, color: theme.green });
    } else if ((c.listPage + 1) * 12 >= campaignEntries.length) {
      const developmentY = top + 263 + Math.ceil(this.entries.length / 4) * 108;
      if (this.entries.length <= 8) {
        panel(ctx, 24, developmentY, 366, 70, { fill: '#DCE5F1', shadow: theme.ink });
        text(ctx, '后续关卡正在开发中', 207, developmentY + 35, { size: 16 });
      }
    }
    const footer = c.levelCampaign === 'classic' ? '完整保留原有 106 关与通关记录'
      : c.levelCampaign === 'adventure' ? '机关章节将逐步开放' : '双人合作玩法将在后续开放';
    text(ctx, footer,
      207, top + 680, { size: 14, color: theme.yellow });
    text(ctx, '完成前一关，解锁下一关 · 难度为预估', 207, top + 704, { size: 12, color: theme.white });
  }
}
