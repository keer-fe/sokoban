import { DIRS, offset, parseLevel, isWon, move } from './rules.js';

export function solveLevel(rows, maxStates = 100000) {
  return solveState(parseLevel(rows), maxStates);
}

export function solveState(start, maxStates = 100000) {
  const key = (state) => `${state.player}|${[...state.boxes].sort().join(';')}`;
  const seen = new Set([key(start)]);
  const queue = [{ state: start, path: '' }];
  const symbols = { up: 'U', right: 'R', down: 'D', left: 'L' };
  for (let head = 0; head < queue.length && queue.length <= maxStates; head += 1) {
    const { state, path } = queue[head];
    if (isWon(state)) return path;
    for (const direction of Object.keys(DIRS)) {
      const copy = { ...state, boxes: new Set(state.boxes), history: [] };
      if (!move(copy, direction)) continue;
      const id = key(copy);
      if (seen.has(id)) continue;
      seen.add(id);
      queue.push({ state: copy, path: path + symbols[direction] });
    }
  }
  return null;
}
