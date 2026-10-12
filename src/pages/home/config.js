// Shared home copy. Runtime statistics are supplied by the progress controller.
export const homeConfig = Object.freeze({
  title: '箱不到八',
  subtitle: 'SOKOBAN',
  buttons: [
    { id: 'start', label: '开始游戏', primary: true },
    { id: 'levels', label: '选择关卡', primary: false },
  ],
  stats: [
    { value: '—', label: '关卡' },
    { value: '0', label: '已通关' },
    { value: '0', label: '撤销卡' },
  ],
});
