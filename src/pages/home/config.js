// Shared home copy. Runtime statistics are supplied by the progress controller.
export const homeConfig = Object.freeze({
  title: '一起推箱子吧',
  subtitle: 'SOKOBAN',
  buttons: [
    { id: 'start', label: '开始游戏', primary: true },
    { id: 'levels', label: '选择关卡', primary: false },
  ],
  stats: [
    { value: '—', label: '体验关卡' },
    { value: '0', label: '已通关' },
    { value: '0', label: '撤销卡' },
  ],
});
