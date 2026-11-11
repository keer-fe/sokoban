import levels from './levels.json' with { type: 'json' };
import { parseLevel, move, undo, isWon } from './rules.js';
import { completeLevel, loadProgress } from './progress.js';
import { solveState } from './solver.js';

export function createGame(storage, onChange = () => {}) {
  let progress = loadProgress(storage);
  let screen = 'home';
  let previousScreen = 'home';
  let level = 1;
  let board = null;
  let facing = 'down';
  let hint = null;
  let muted = storage.getItem('sokoban-muted-v1') === '1';
  const publish = () => onChange({ screen, level, board, progress, muted, facing, hint });
  const start = (number = progress.unlocked) => {
    if (!Number.isInteger(number) || number < 1 || number > progress.unlocked) return false;
    level = number;
    board = parseLevel(levels[number - 1].rows);
    facing = 'down';
    hint = null;
    screen = 'game';
    publish();
    return true;
  };
  return {
    get state() { return { screen, level, board, progress, muted, facing, hint }; },
    home() { screen = 'home'; publish(); },
    select() { screen = 'levels'; publish(); },
    settings() { previousScreen = screen; screen = 'settings'; publish(); },
    closeSettings() { screen = previousScreen; publish(); },
    start,
    restart() { return start(level); },
    move(direction) {
      if (screen !== 'game' || !move(board, direction)) return false;
      facing = direction;
      hint = null;
      if (isWon(board)) {
        progress = completeLevel(storage, progress, level, board.moves);
        screen = 'win';
      }
      publish();
      return true;
    },
    undo() { if (screen !== 'game' || !undo(board)) return false; hint = null; publish(); return true; },
    showHint() {
      if (screen !== 'game') return false;
      const step = solveState(board)?.[0];
      hint = { U: 'up', R: 'right', D: 'down', L: 'left' }[step] || null;
      publish();
      return !!hint;
    },
    toggleMute() { muted = !muted; storage.setItem('sokoban-muted-v1', muted ? '1' : '0'); publish(); return muted; }
  };
}
