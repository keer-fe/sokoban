import { createViewport, toLogicalPoint } from './core/viewport.js';
import { HomePage } from './pages/home/index.js';
import { theme } from './ui/theme.js';

export function createApp(platform, actions = {}) {
  const ctx = platform.canvas.getContext('2d');
  const page = new HomePage({ onAction(id) {
    if (actions[id]) actions[id]();
    else platform.notify(id === 'start' ? '游戏关卡正在开发中' : '选关页面正在开发中');
  } });
  let viewport;
  let running = false;
  let started = false;
  let frameId = null;
  let unsubscribe = null;
  let elapsed = 0;
  let previousTime = 0;

  function resize() {
    viewport = createViewport(platform.getWindowInfo());
    platform.canvas.width = Math.round(viewport.physicalWidth * viewport.pixelRatio);
    platform.canvas.height = Math.round(viewport.physicalHeight * viewport.pixelRatio);
    page.resize(viewport);
    render();
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = theme.sky;
    ctx.fillRect(0, 0, platform.canvas.width, platform.canvas.height);
    const ratio = viewport.pixelRatio;
    ctx.setTransform(viewport.scale * ratio, 0, 0, viewport.scale * ratio, viewport.offsetX * ratio, 0);
    page.render(ctx, elapsed);
  }

  function tick() {
    if (!running) return;
    const now = platform.now();
    elapsed += Math.min((now - previousTime) / 1000, 0.1);
    previousTime = now;
    render();
    frameId = platform.requestFrame(tick);
  }

  function resume() {
    if (running) return;
    running = true;
    previousTime = platform.now();
    resize();
    frameId = platform.requestFrame(tick);
  }

  function pause() {
    running = false;
    if (frameId !== null) platform.cancelFrame(frameId);
    frameId = null;
    page.pause();
  }

  return {
    start() {
      if (started) return;
      started = true;
      unsubscribe = platform.subscribe({
        pointer(type, point) {
          if (running) {
            page.handlePointer(type, toLogicalPoint(viewport, point));
            render();
          }
        },
        show: resume,
        hide: pause,
        resize,
      });
      resume();
    },
    destroy() {
      pause();
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
      started = false;
    },
  };
}
