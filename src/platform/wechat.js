import { runGame } from '../app/main.js';

const canvas = wx.createCanvas();
const audio = {};
for (const name of ['tap', 'step', 'push', 'goal', 'win']) {
  const player = wx.createInnerAudioContext();
  player.src = `assets/sfx/${name}.wav`;
  player.volume = name === 'step' ? .23 : name === 'push' ? .31 : .36;
  audio[name] = player;
}
const storage = {
  getItem(key) {
    const value = wx.getStorageSync(key);
    return value === '' || value == null ? null : String(value);
  },
  setItem(key, value) { wx.setStorageSync(key, value); }
};
runGame({
  canvas,
  createImage: () => wx.createImage(),
  storage,
  size() {
    const info = wx.getSystemInfoSync();
    return { width: info.windowWidth, height: info.windowHeight, dpr: Math.min(2, info.pixelRatio || 1) };
  },
  frame: (fn) => {
    if (typeof canvas.requestAnimationFrame === 'function') return canvas.requestAnimationFrame(fn);
    if (typeof wx.requestAnimationFrame === 'function') return wx.requestAnimationFrame(fn);
    return setTimeout(() => fn(Date.now()), 16);
  },
  onResize: (fn) => wx.onWindowResize?.(fn),
  onTouch: (fn) => {
    wx.onTouchStart((event) => {
      const touch = event.touches[0];
      if (touch) fn('start', { x: touch.clientX, y: touch.clientY });
    });
    wx.onTouchMove((event) => {
      const touch = event.touches[0];
      if (touch) fn('move', { x: touch.clientX, y: touch.clientY });
    });
    wx.onTouchEnd((event) => {
      const touch = event.changedTouches[0];
      if (touch) fn('end', { x: touch.clientX, y: touch.clientY });
    });
    wx.onTouchCancel(() => fn('cancel', { x: 0, y: 0 }));
  },
  sound: (kind) => {
    const player = audio[kind];
    if (player) { player.stop(); player.play(); }
  }
});
