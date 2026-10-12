import { createApp } from '../src/app.js';

const canvas = document.querySelector('canvas');
const toast = document.querySelector('#toast');
const params = new URLSearchParams(location.search);
let toastTimer;
const app = createApp({
  canvas,
  createImage: () => new Image(),
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
