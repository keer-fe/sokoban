import { createViewport, toLogicalPoint } from './core/viewport.js';
import { HomePage } from './pages/home/index.js';
import { theme } from './ui/theme.js';
import { GameController } from './game/controller.js';
import { LevelsPage } from './pages/levels/index.js';
import { GamePage } from './pages/game/index.js';
import { Modal } from './ui/modal.js';
import { loadArt } from './ui/art.js';
import { homeIconFileIDs, loadHomeIcons } from './ui/home-icons.js';
import { loadHomeFont } from './ui/home-font.js';
import { FriendsPage } from './pages/friends/index.js';
import { drawLoading } from './ui/loading.js';

const BG_MUSIC_URL = 'https://636c-cloud1-d5gqpaioo2d8acf27-1443887035.tcb.qcloud.la/music/bg.mp3?sign=389193686ab75c45471eed1d38bd3e4f&t=1791866058';

export function createApp(platform, actions = {}) {
  const ctx = platform.canvas.getContext('2d');
  loadArt(ctx, platform);
  const cloudTotal = platform.resolveCloudFiles
    ? (platform.createImage ? Object.keys(homeIconFileIDs).length : 0) + (platform.loadFont ? 1 : 0) : 0;
  let cloudLoaded = 0;
  let loading = cloudTotal > 0;
  const cloudSettled = () => {
    cloudLoaded = Math.min(cloudTotal, cloudLoaded + 1);
    loading = cloudLoaded < cloudTotal;
  };
  loadHomeIcons(ctx, platform, cloudSettled);
  loadHomeFont(platform, cloudSettled);
  const controller = new GameController(platform);
  const bgMusic = platform.createAudio
    ? platform.createAudio(BG_MUSIC_URL, { loop: true, volume: 0.5 })
    : null;
  // Try to autoplay immediately. If the browser blocks it (autoplay policy),
  // we retry on the first user interaction.
  const startBgMusic = () => { if (bgMusic) bgMusic.play(); };
  const dispatch = (id) => {
    if (actions[id]) actions[id](); else controller.handle(id);
    Object.values(pages).forEach((screen) => screen.pause());
    modal.pause();
    friendsDialog.pause();
    refreshLayout();
  };
  const pages = {
    home: new HomePage({ onAction: dispatch, controller }),
    levels: new LevelsPage(controller, dispatch),
    game: new GamePage(controller, dispatch),
  };
  const modal = new Modal(controller, dispatch);
  const friendsDialog = new FriendsPage(controller, dispatch);
  let viewport;
  let running = false;
  let started = false;
  let frameId = null;
  let unsubscribe = null;
  let elapsed = 0;
  let previousTime = 0;
  let friendsVisible = false;
  let visibleBoard = null;

  function syncGameClubButton() {
    if (!platform.gameClubButton || !viewport) return;
    const visible = running && !loading && controller.route === 'home' && !controller.modal;
    if (!visible) {
      platform.gameClubButton.hide();
      return;
    }
    const bounds = pages.home.getGameClubButtonBounds();
    if (!bounds) return;
    platform.gameClubButton.update({
      left: viewport.offsetX + bounds.x * viewport.scale,
      top: bounds.y * viewport.scale,
      width: bounds.width * viewport.scale,
      height: bounds.height * viewport.scale,
    });
    platform.gameClubButton.show();
  }

  function refreshLayout() {
    if (!viewport) return;
    pages[controller.route].resize(viewport);
    if (controller.modal === 'friends') friendsDialog.resize(viewport);
    else if (controller.modal) modal.resize(viewport);
    const showFriends = controller.modal === 'friends';
    if (platform.friendBoard && showFriends !== friendsVisible) {
      platform.friendBoard.send(showFriends ? 'show' : 'hide', showFriends
        ? { completed: controller.progress.completedLevels } : {});
    }
    friendsVisible = showFriends;
    const board = controller.modal === 'win' ? `level:${controller.game.level.id}` : null;
    if (platform.friendBoard) {
      if (board) {
        platform.friendBoard.send('resize', { width: 300, height: 180, pixelRatio: viewport.pixelRatio });
        if (board !== visibleBoard) platform.friendBoard.send('level-show', {
          levelId: controller.game.level.id,
          steps: controller.progress.state.records[controller.game.level.id]?.bestSteps,
        });
      } else if (visibleBoard && !showFriends) platform.friendBoard.send('hide');
    }
    visibleBoard = board;
    syncGameClubButton();
  }

  function resize() {
    viewport = createViewport(platform.getWindowInfo());
    platform.canvas.width = Math.round(viewport.physicalWidth * viewport.pixelRatio);
    platform.canvas.height = Math.round(viewport.physicalHeight * viewport.pixelRatio);
    refreshLayout();
    render();
  }

  function render() {
    syncGameClubButton();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = theme.sky;
    ctx.fillRect(0, 0, platform.canvas.width, platform.canvas.height);
    const ratio = viewport.pixelRatio;
    ctx.setTransform(viewport.scale * ratio, 0, 0, viewport.scale * ratio, viewport.offsetX * ratio, 0);
    if (loading) {
      drawLoading(ctx, viewport, elapsed, cloudTotal ? cloudLoaded / cloudTotal : 1);
      return;
    }
    pages[controller.route].render(ctx, elapsed);
    if (controller.modal === 'friends') friendsDialog.render(ctx, elapsed);
    else if (controller.modal) modal.render(ctx, elapsed);
  }

  function tick() {
    if (!running) return;
    const now = platform.now();
    controller.advanceReplay(now - previousTime);
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
    startBgMusic();
    frameId = platform.requestFrame(tick);
  }

  function pause() {
    if (controller.replay) { controller.replay.playing = false; controller.replay.elapsed = 0; }
    running = false;
    if (frameId !== null) platform.cancelFrame(frameId);
    frameId = null;
    Object.values(pages).forEach((page) => page.pause());
    modal.pause();
    friendsDialog.pause();
    friendsVisible = false;
    visibleBoard = null;
    if (platform.friendBoard) platform.friendBoard.send('pause');
    if (platform.gameClubButton) platform.gameClubButton.hide();
    if (bgMusic) bgMusic.pause();
  }

  return {
    start() {
      if (started) return;
      started = true;
      unsubscribe = platform.subscribe({
        pointer(type, point) {
          if (running && !loading) {
            (controller.modal === 'friends' ? friendsDialog : controller.modal
              ? modal : pages[controller.route]).handlePointer(type, toLogicalPoint(viewport, point));
            render();
          }
        },
        wheel(deltaY, point) {
          if (running && !loading && controller.modal === 'friends') {
            friendsDialog.handleWheel(deltaY, toLogicalPoint(viewport, point));
            render();
          }
        },
        key(action) {
          if (running && !loading && controller.route === 'game' && !controller.modal) { dispatch(action); render(); }
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
      if (platform.gameClubButton) platform.gameClubButton.destroy();
      if (bgMusic) bgMusic.destroy();
    },
  };
}
