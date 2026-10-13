import { createApp } from '../src/app.js';
import { createDemoFriends } from './friends.js';

const canvas = document.querySelector('canvas');
const toast = document.querySelector('#toast');
const params = new URLSearchParams(location.search);
let toastTimer;
const app = createApp({
  canvas,
  friendBoard: ['demo', 'empty', 'error', 'offline'].includes(params.get('friends'))
    ? createDemoFriends(params.get('friends')) : null,
  createImage: () => new Image(),
  loadFont(url) {
    const family = 'NishikiTeki';
    if (typeof FontFace === 'function') {
      const face = new FontFace(family, `url(${url})`);
      face.load().then(font => document.fonts.add(font)).catch(() => {});
    }
    return family;
  },
  createAudio(src, { loop = false, volume = 1 } = {}) {
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = volume;
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    let unlockBound = false;
    const tryPlay = () => {
      const p = audio.play();
      if (p && p.catch) p.catch(() => bindUnlock());
    };
    const bindUnlock = () => {
      if (unlockBound) return;
      unlockBound = true;
      const unlock = () => {
        unlockBound = false;
        document.removeEventListener('pointerdown', unlock, true);
        document.removeEventListener('keydown', unlock, true);
        document.removeEventListener('touchstart', unlock, true);
        tryPlay();
      };
      document.addEventListener('pointerdown', unlock, true);
      document.addEventListener('keydown', unlock, true);
      document.addEventListener('touchstart', unlock, true);
    };
    return {
      play: tryPlay,
      pause: () => audio.pause(),
      stop: () => { audio.pause(); audio.currentTime = 0; },
      destroy: () => { audio.pause(); audio.src = ''; },
      setVolume: (v) => { audio.volume = v; },
    };
  },
  now: () => performance.now(),
  wallNow: () => Date.now(),
  readStorage: (key) => JSON.parse(localStorage.getItem(key) || 'null'),
  writeStorage: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (id) => cancelAnimationFrame(id),
  getWindowInfo: () => ({ width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio,
    safeTop: Number(params.get('safeTop')) || 0, safeBottom: Number(params.get('safeBottom')) || 0 }),
  notify(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toastTimer = setTimeout(() => { toast.textContent = ''; }, 1800);
  },
  subscribe({ pointer, show, hide, resize, key }) {
    const events = { pointerdown: 'start', pointermove: 'move', pointerup: 'end', pointercancel: 'cancel' };
    const handlers = Object.entries(events).map(([event, type]) => {
      const handler = (e) => {
        if (type === 'start') canvas.setPointerCapture(e.pointerId);
        pointer(type, { x: e.clientX, y: e.clientY, id: e.pointerId });
      };
      canvas.addEventListener(event, handler);
      return [event, handler];
    });
    const visibility = () => document.hidden ? hide() : show();
    const keyboard = (event) => {
      const action = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', u: 'undo', Escape: 'menu' }[event.key];
      if (action) { event.preventDefault(); if (!event.repeat) key(action); }
    };
    window.addEventListener('keydown', keyboard);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('resize', resize);
    return () => {
      handlers.forEach(([event, handler]) => canvas.removeEventListener(event, handler));
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', keyboard);
      clearTimeout(toastTimer);
    };
  },
});
app.start();
window.addEventListener('pagehide', () => app.destroy(), { once: true });
