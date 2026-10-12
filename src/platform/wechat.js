import { createFriendBoard } from './friend-board.js';

// The simulator can return {} for the menu capsule. Never pass undefined into layout math.
export function normalizeWechatWindowInfo(info, capsule) {
  const validInset = (value, max) => Number.isFinite(value) && value >= 0 && value < max;
  const height = info.windowHeight;
  const safeTop = validInset(info.safeArea && info.safeArea.top, height / 2)
    ? info.safeArea.top : 0;
  const statusBarHeight = validInset(info.statusBarHeight, height / 2) ? info.statusBarHeight : 0;
  const capsuleBottom = capsule && capsule.bottom;
  // Reserve a navigation row below the status bar when capsule geometry is unavailable.
  const top = validInset(capsuleBottom, height / 2) && capsuleBottom > 0
    ? Math.max(safeTop, capsuleBottom) : Math.max(safeTop, statusBarHeight) + 44;
  const bottom = info.safeArea && info.safeArea.bottom;
  return {
    width: info.windowWidth,
    height,
    pixelRatio: info.pixelRatio,
    safeTop: top,
    safeBottom: Number.isFinite(bottom) && bottom > height / 2 && bottom <= height ? height - bottom : 0,
  };
}

// wx stays at the platform boundary. Pages never depend on a global wx object.
export function createWechatPlatform(api) {
  const canvas = api.createCanvas();
  return {
    canvas,
    friendBoard: createFriendBoard(api),
    createImage: () => api.createImage(),
    now: () => Date.now(),
    wallNow: () => Date.now(),
    readStorage: (key) => api.getStorageSync(key),
    writeStorage: (key, value) => api.setStorageSync(key, value),
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (id) => cancelAnimationFrame(id),
    getWindowInfo() {
      const info = api.getWindowInfo();
      const capsule = typeof api.getMenuButtonBoundingClientRect === 'function'
        ? api.getMenuButtonBoundingClientRect() : null;
      return normalizeWechatWindowInfo(info, capsule);
    },
    notify: (title) => api.showToast({ title, icon: 'none', duration: 1800 }),
    subscribe({ pointer, show, hide, resize }) {
      const wrap = (type) => (event) => {
        const touches = event.changedTouches || [];
        touches.forEach((touch) => pointer(type, {
          id: touch.identifier, x: touch.clientX, y: touch.clientY,
        }));
      };
      const start = wrap('start');
      const move = wrap('move');
      const end = wrap('end');
      const cancel = () => pointer('cancel', { id: -1, x: 0, y: 0 });
      api.onTouchStart(start); api.onTouchMove(move);
      api.onTouchEnd(end); api.onTouchCancel(cancel);
      api.onShow(show); api.onHide(hide); api.onWindowResize(resize);
      return () => {
        api.offTouchStart(start); api.offTouchMove(move);
        api.offTouchEnd(end); api.offTouchCancel(cancel);
        api.offShow(show); api.offHide(hide); api.offWindowResize(resize);
      };
    },
  };
}
