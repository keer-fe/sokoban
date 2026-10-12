import { Screen, header, stars, lock } from '../../ui/screen.js';
import { panel, text } from '../../ui/draw.js';
import { drawButton } from '../../ui/button.js';
import { ground } from '../../ui/illustrations.js';
import { difficulties } from '../../game/levels.js';
import { theme } from '../../ui/theme.js';

export class LevelsPage extends Screen {
  layout() {
    const c = this.controller;
    const top = this.viewport.safeTop + 20;
    this.top = top;
    const entries = c.levels.map((level, index) => ({ level, index })).filter(({ level }) => level.difficulty === c.filter);
    this.entries = entries.slice(c.listPage * 12, (c.listPage + 1) * 12);
    this.buttons = [{ id: 'home', label: '‹', x: 18, y: top, width: 44, height: 44, fontSize: 30 },
      ...difficulties.map((name, i) => ({ id: `filter:${name}`, label: name, x: 24 + i * 125,
        y: top + 171, width: 115, height: 48, fontSize: 15, fill: name === c.filter ? theme.yellow : theme.white })),
      ...this.entries.map(({ index }, i) => ({ id: `level:${index}`, label: '',
        x: 24 + (i % 4) * 94, y: top + 281 + Math.floor(i / 4) * 98, width: 82, height: 82 })),
    ];
    if (entries.length > 12) this.buttons.push(
      { id: 'previous', label: '上一页', x: 24, y: top + 590, width: 108, height: 46, disabled: c.listPage === 0 },
      { id: 'following', label: '下一页', x: 282, y: top + 590, width: 108, height: 46,
        disabled: (c.listPage + 1) * 12 >= entries.length });
  }
  render(ctx) {
    this.layout();
    const c = this.controller;
    const { top } = this;
    const completed = Object.keys(c.progress.state.records).length;
    ground(ctx, 414, this.viewport.height, this.viewport.safeBottom);
    header(ctx, top, '选择关卡', `${c.levels.length} 个关卡 · 一步一步来`);
    panel(ctx, 24, top + 91, 366, 60, { fill: theme.white, shadow: theme.ink });
    text(ctx, '总进度', 43, top + 109, { size: 13, align: 'left' });
    text(ctx, `${completed} / ${c.levels.length}`, 370, top + 109, { size: 13, align: 'right' });
    panel(ctx, 43, top + 128, 328, 9, { fill: '#DCE5F1', lineWidth: 0 });
    if (completed) panel(ctx, 43, top + 128, 328 * completed / c.levels.length, 9,
      { fill: theme.green, lineWidth: 0 });
    text(ctx, `第 ${c.filter}`, 25, top + 251, { size: 20, color: theme.white, outline: 1, align: 'left' });
    const groupCount = c.levels.filter((level) => level.difficulty === c.filter).length;
    text(ctx, `${c.listPage + 1} / ${Math.ceil(groupCount / 12)} 页`, 389, top + 251,
      { size: 14, color: theme.yellow, align: 'right' });
    this.buttons.forEach((button) => {
      if (!button.id.startsWith('level:')) drawButton(ctx, button, this.input.activeId === button.id);
      else {
        const index = Number(button.id.split(':')[1]);
        const locked = index > c.progress.unlocked;
        const record = c.progress.state.records[c.levels[index].id];
        const fill = locked ? '#B8C6D9' : record ? '#52BD66' : theme.yellow;
        drawButton(ctx, { ...button, fill }, this.input.activeId === button.id);
        text(ctx, index + 1, button.x + 41, button.y + 27, { size: 26, color: locked ? '#67768F' : theme.ink });
        if (locked) lock(ctx, button.x + 32, button.y + 48, 18);
        else if (record && !record.stars) text(ctx, '已通关', button.x + 41, button.y + 61, { size: 13 });
        else if (!c.levels[index].minSteps) text(ctx, '挑战', button.x + 41, button.y + 61, { size: 13 });
        else stars(ctx, record ? record.stars : 0, button.x + 12, button.y + 51, 16, 5);
      }
    });
    const hintY = Math.min(top + 667, this.viewport.height - this.viewport.safeBottom - 137);
    text(ctx, '完成前一关，解锁下一段挑战', 207, hintY, { size: 13, color: theme.white });
  }
}
