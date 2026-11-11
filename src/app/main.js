import { createGame } from '../core/game.js';
import { createRenderer } from './render-geometric.js';

export function runGame(env) {
  const { canvas, storage } = env;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  const renderer = createRenderer(ctx);
  const game = createGame(storage);
  let scale = 1, logicalHeight = 844, touchStart = null;
  let holdTimer = null, holdRepeat = null, holdMoved = false;
  let pendingMove = null;
  const clearHold = () => { if (holdTimer) clearTimeout(holdTimer); if (holdRepeat) clearInterval(holdRepeat); holdTimer = null; holdRepeat = null; };

  function resize() {
    const { width, height, dpr } = env.size();
    scale = width / 390;
    logicalHeight = height / scale;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (canvas.style) { canvas.style.width = `${width}px`; canvas.style.height = `${height}px`; }
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  }
  function draw(time) {
    ctx.clearRect(0, 0, 390, logicalHeight);
    renderer.draw(game.state, 390, logicalHeight, time);
    if (pendingMove && !renderer.isMoving(time)) {
      const next = pendingMove;
      pendingMove = null;
      act(next);
    }
    env.frame(draw);
  }
  function act(action) {
    if (!action || action[0] === 'locked' || action[0] === 'board') return;
    if (action[0] === 'move' && renderer.isMoving()) {
      pendingMove = action;
      return;
    }
    if (action[0] !== 'move') pendingMove = null;
    const before = game.state.board && (action[0] === 'move' || action[0] === 'undo')
      ? { screen: game.state.screen, level: game.state.level, player: game.state.board.player, boxes: new Set(game.state.board.boxes) }
      : null;
    let changed = false;
    switch (action[0]) {
      case 'home': game.home(); changed = true; break;
      case 'levels': game.select(); changed = true; break;
      case 'settings': game.settings(); changed = true; break;
      case 'closeSettings': game.closeSettings(); changed = true; break;
      case 'start': changed = game.start(); break;
      case 'level': changed = game.start(action[1]); break;
      case 'move': changed = game.move(action[1]); break;
      case 'undo': changed = game.undo(); break;
      case 'restart': changed = game.restart(); break;
      case 'hint': changed = game.showHint(); break;
      case 'mute': game.toggleMute(); changed = true; break;
      default: break;
    }
    if (changed && before) renderer.transition(before, game.state);
    if (game.state.screen === 'win') pendingMove = null;
    if (changed && !game.state.muted) {
      let sound = 'tap';
      if (action[0] === 'move') {
        const board = game.state.board;
        const pushed = [...board.boxes].some((at) => !before.boxes.has(at));
        sound = game.state.screen === 'win' ? 'win' : pushed
          ? [...board.boxes].some((at) => !before.boxes.has(at) && board.goals.has(at)) ? 'goal' : 'push'
          : 'step';
      }
      env.sound?.(sound);
    }
  }
  function onTouch(type, point) {
    if (type === 'cancel') { clearHold(); touchStart = null; return; }
    const x = point.x / scale, y = point.y / scale;
    if (type === 'start') {
      clearHold(); holdMoved = false;
      const action = renderer.hit(x, y);
      touchStart = { x, y, action };
      if (action?.[0] === 'move') holdTimer = setTimeout(() => {
        holdMoved = true; act(action);
        holdRepeat = setInterval(() => act(action), 135);
      }, 340);
      return;
    }
    if (!touchStart) return;
    if (type === 'move') {
      const over = renderer.hit(x, y);
      if (Math.hypot(x - touchStart.x, y - touchStart.y) > 20 || over?.[0] !== touchStart.action?.[0] || over?.[1] !== touchStart.action?.[1]) clearHold();
      return;
    }
    clearHold();
    if (holdMoved) { pendingMove = null; touchStart = null; return; }
    const dx = x - touchStart.x, dy = y - touchStart.y;
    const startedOnBoard = touchStart.action?.[0] === 'board';
    if (startedOnBoard && Math.max(Math.abs(dx), Math.abs(dy)) > 24) {
      act(['move', Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')]);
    } else if (Math.hypot(dx, dy) < 20) act(renderer.hit(x, y));
    touchStart = null;
  }
  env.onTouch(onTouch);
  env.onResize?.(resize);
  env.onKey?.((direction) => act(['move', direction]));
  resize();
  draw(0);
  return game;
}
