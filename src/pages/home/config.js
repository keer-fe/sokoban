// Design copy, not playable level metadata. Replace stats when the level catalog is connected.
export const homeConfig = Object.freeze({
  title: '一起推箱子吧',
  subtitle: 'SOKOBAN',
  buttons: [
    { id: 'start', label: '开始游戏', primary: true },
    { id: 'levels', label: '选择关卡', primary: false },
  ],
  stats: [
    { value: '100', label: '关卡' },
    { value: '3', label: '难度' },
    { value: '∞', label: '乐趣' },
  ],
});
