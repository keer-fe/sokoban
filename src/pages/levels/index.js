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
    const entries = c.levels.map((level, index) => ({ level, index }));
    this.entries = entries.slice(c.listPage * 12, (c.listPage + 1) * 12);
    this.buttons = [{ id: 'home', label: '‹', x: 18, y: top, width: 44, height: 44, fontSize: 30 },
      ...this.entries.map(({ index }, i) => ({ id: `level:${index}`, label: '',
        x: 24 + (i % 4) * 94, y: top + 211 + Math.floor(i / 4) * 108, width: 82, height: 96 })),
    ];
    if (entries.length > 12) this.buttons.push(
      { id: 'previous', label: '上一页', x: 24, y: top + 551, width: 108, height: 46, disabled: c.listPage === 0 },
      { id: 'following', label: '下一页', x: 282, y: top + 551, width: 108, height: 46,
        disabled: (c.listPage + 1) * 12 >= entries.length });
  }
  render(ctx) {
    this.layout();
    const c = this.controller;
    const { top } = this;
    const completed = c.progress.completedLevels;
    ground(ctx, 414, this.viewport.height, this.viewport.safeBottom);
    header(ctx, top, '选择关卡', `已开放 ${c.levels.length} 关 · 一步一步来`);
    panel(ctx, 24, top + 91, 366, 60, { fill: theme.white, shadow: theme.ink });
    text(ctx, '总进度', 43, top + 109, { size: 13, align: 'left' });
    text(ctx, `${completed} / ${c.levels.length}`, 370, top + 109, { size: 13, align: 'right' });
    panel(ctx, 43, top + 128, 328, 9, { fill: '#DCE5F1', lineWidth: 0 });
    if (completed) panel(ctx, 43, top + 128, 328 * completed / c.levels.length, 9,
      { fill: theme.green, lineWidth: 0 });
    text(ctx, '全部关卡', 25, top + 181, { size: 20, color: theme.white, outline: 1, align: 'left' });
    text(ctx, `${c.listPage + 1} / ${Math.ceil(c.levels.length / 12)} 页`, 389, top + 181,
      { size: 14, color: theme.yellow, align: 'right' });
    this.buttons.forEach((button) => {
      if (!button.id.startsWith('level:')) drawButton(ctx, button, this.input.activeId === button.id);
      else {
        const index = Number(button.id.split(':')[1]);
        const locked = !c.progress.isUnlocked(index);
        const record = c.progress.state.records[c.levels[index].id];
        const fill = locked ? '#B8C6D9' : record ? '#52BD66' : theme.yellow;
        drawButton(ctx, { ...button, fill }, this.input.activeId === button.id);
        text(ctx, index + 1, button.x + 41, button.y + 27, { size: 26, color: locked ? '#67768F' : theme.ink });
        text(ctx, c.levels[index].difficulty, button.x + 41, button.y + 52, { size: 13, color: theme.ink });
        if (locked) lock(ctx, button.x + 32, button.y + 68, 18);
        else if (record && !record.stars) text(ctx, '已通关', button.x + 41, button.y + 78, { size: 12 });
        else if (!c.levels[index].minSteps) text(ctx, '待评星', button.x + 41, button.y + 78, { size: 12 });
        else stars(ctx, record ? record.stars : 0, button.x + 12, button.y + 70, 16, 5);
      }
    });
    if ((c.listPage + 1) * 12 >= c.levels.length) {
      const developmentY = top + 211 + Math.ceil(this.entries.length / 4) * 108;
      if (this.entries.length <= 8) {
        panel(ctx, 24, developmentY, 366, 70, { fill: '#DCE5F1', shadow: theme.ink });
        text(ctx, '后续关卡正在开发中', 207, developmentY + 35, { size: 16 });
      }
    }
    text(ctx, '更多关卡，敬请期待', 207, top + 628, { size: 15, color: theme.yellow });
    text(ctx, '完成前一关，解锁下一关 · 难度为预估', 207, top + 654, { size: 12, color: theme.white });
  }
}
