import { createViewport, toLogicalPoint } from './core/viewport.js';
import { HomePage } from './pages/home/index.js';
import { theme } from './ui/theme.js';
import { GameController } from './game/controller.js';
import { LevelsPage } from './pages/levels/index.js';
import { GamePage } from './pages/game/index.js';
import { Modal } from './ui/modal.js';
import { loadArt } from './ui/art.js';
import { FriendsPage } from './pages/friends/index.js';

export function createApp(platform, actions = {}) {
  const ctx = platform.canvas.getContext('2d');
  loadArt(ctx, platform);
  const controller = new GameController(platform);
  const dispatch = (id) => {
    if (actions[id]) actions[id](); else controller.handle(id);
    Object.values(pages).forEach((screen) => screen.pause());
    modal.pause();
    refreshLayout();
  };
  const pages = {
    home: new HomePage({ onAction: dispatch, controller }),
    levels: new LevelsPage(controller, dispatch),
    game: new GamePage(controller, dispatch),
    friends: new FriendsPage(controller, dispatch),
  };
  const modal = new Modal(controller, dispatch);
  let viewport;
  let running = false;
  let started = false;
  let frameId = null;
  let unsubscribe = null;
  let elapsed = 0;
  let previousTime = 0;
  let visibleRoute = null;
  let visibleBoard = null;

  function refreshLayout() {
    if (!viewport) return;
    pages[controller.route].resize(viewport);
    if (visibleRoute !== controller.route) {
      if (platform.friendBoard) {
        if (visibleRoute === 'friends') platform.friendBoard.send('hide');
        if (controller.route === 'friends') platform.friendBoard.send('show', { completed: controller.progress.completedLevels });
      }
      visibleRoute = controller.route;
    }
    if (controller.modal) modal.resize(viewport);
    const board = controller.modal === 'win' ? `level:${controller.game.level.id}` : null;
    if (platform.friendBoard) {
      if (board) {
        platform.friendBoard.send('resize', { width: 300, height: 180, pixelRatio: viewport.pixelRatio });
        if (board !== visibleBoard) platform.friendBoard.send('level-show', {
          levelId: controller.game.level.id,
          steps: controller.progress.state.records[controller.game.level.id]?.bestSteps,
        });
      } else if (visibleBoard && controller.route !== 'friends') platform.friendBoard.send('hide');
    }
    visibleBoard = board;
  }

  function resize() {
    viewport = createViewport(platform.getWindowInfo());
    platform.canvas.width = Math.round(viewport.physicalWidth * viewport.pixelRatio);
    platform.canvas.height = Math.round(viewport.physicalHeight * viewport.pixelRatio);
    refreshLayout();
    render();
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = theme.sky;
    ctx.fillRect(0, 0, platform.canvas.width, platform.canvas.height);
    const ratio = viewport.pixelRatio;
    ctx.setTransform(viewport.scale * ratio, 0, 0, viewport.scale * ratio, viewport.offsetX * ratio, 0);
    pages[controller.route].render(ctx, elapsed);
    if (controller.modal) modal.render(ctx, elapsed);
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
    controller.syncFriends();
    if (controller.route === 'friends' && platform.friendBoard) {
      platform.friendBoard.send('show', { completed: controller.progress.completedLevels });
    }
    frameId = platform.requestFrame(tick);
  }

  function pause() {
    running = false;
    if (frameId !== null) platform.cancelFrame(frameId);
    frameId = null;
    Object.values(pages).forEach((page) => page.pause());
    modal.pause();
    visibleBoard = null;
    if (platform.friendBoard) platform.friendBoard.send('pause');
  }

  return {
    start() {
      if (started) return;
      started = true;
      unsubscribe = platform.subscribe({
        pointer(type, point) {
          if (running) {
            (controller.modal ? modal : pages[controller.route]).handlePointer(type, toLogicalPoint(viewport, point));
            render();
          }
        },
        key(action) {
          if (running && controller.route === 'game' && !controller.modal) { dispatch(action); render(); }
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
