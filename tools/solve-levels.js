import { levels } from '../src/game/levels.js';
import { parseLevel, transition, isComplete, directions } from '../src/game/engine.js';

// BFS counts every successful player move equally; the first solution is a shortest path.
export function solve(level, { maxStates = 500000, maxMs = 5000 } = {}) {
  const startTime = Date.now();
  const board = parseLevel(level);
  const initial = { player: board.player, boxes: board.boxes, steps: 0 };
  const key = (state) => `${state.player}:${[...state.boxes].sort((a, b) => a - b).join(',')}`;
  const queue = [{ state: initial, path: [] }];
  const seen = new Set([key(initial)]);
  for (let index = 0; index < queue.length; index += 1) {
    const { state, path } = queue[index];
    if (isComplete(board, state)) return path;
    for (const direction of Object.keys(directions)) {
      const next = transition(board, state, direction);
      if (next && !seen.has(key(next))) {
        seen.add(key(next)); queue.push({ state: next, path: [...path, direction] });
      }
    }
    if (seen.size > maxStates || Date.now() - startTime > maxMs) throw new Error(`Solver budget exceeded: ${level.id}`);
  }
  throw new Error(`Unsolvable: ${level.id}`);
}

if (process.argv[1] && import.meta.url.endsWith('/' + process.argv[1].split('/').pop())) {
  const maxStates = Number(process.env.SOLVER_MAX_STATES || 4_000_000);
  const maxMs = Number(process.env.SOLVER_MAX_MS || 60_000);
  const only = process.env.SOLVER_ONLY ? new Set(process.env.SOLVER_ONLY.split(',').map(Number)) : null;
  for (const level of levels) {
    if (only && !only.has(level.sourceNumber)) continue;
    const started = Date.now();
    try {
      const path = solve(level, { maxStates, maxMs });
      console.log(JSON.stringify({ id: level.id, sourceNumber: level.sourceNumber, boxCount: level.boxCount, minSteps: path.length, ms: Date.now() - started }));
    } catch (error) {
      console.log(JSON.stringify({ id: level.id, sourceNumber: level.sourceNumber, boxCount: level.boxCount, pending: true, ms: Date.now() - started, reason: error.message }));
    }
  }
}
