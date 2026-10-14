// Shared home copy. Runtime card count is supplied by the progress controller.
export const homeConfig = Object.freeze({
  title: '箱不到八',
  subtitle: '欢乐推箱子',
  shortcuts: [
    { id: 'signin', label: '签到', icon: 'signin' },
    { id: 'friends', label: '排行榜', icon: 'friends' },
    { id: 'settings', label: '设置', icon: 'settings' },
    { id: 'gameClub', label: '游戏圈', native: true },
  ],
  buttons: [
    { id: 'start', label: '开始游戏', primary: true, art: 'startButton' },
    { id: 'levels', label: '选择关卡', primary: false, art: 'levelsButton' },
  ],
});
