import { parseLevel, transition, isComplete, directions } from '../src/game/engine.js';

export function solve(level, { maxStates = 3_000_000, maxMs = 30_000 } = {}) {
  const start = Date.now();
  const board = parseLevel(level);
  const initial = { player: board.player, boxes: board.boxes, steps: 0 };
  const key = (s) => `${s.player}:${[...s.boxes].sort((a, b) => a - b).join(',')}`;
  const queue = [{ state: initial, path: [] }];
  const seen = new Set([key(initial)]);
  for (let i = 0; i < queue.length; i += 1) {
    const { state, path } = queue[i];
    if (isComplete(board, state)) return path;
    for (const d of Object.keys(directions)) {
      const n = transition(board, state, d);
      if (n && !seen.has(key(n))) {
        seen.add(key(n));
        queue.push({ state: n, path: [...path, d] });
      }
    }
    if (seen.size > maxStates || Date.now() - start > maxMs) throw new Error('budget');
  }
  throw new Error('unsolvable');
}

// Final mechanism-chapter candidates. Each is BFS-verified and highlights
// a distinct interaction with the button-and-door system.
const candidates = [
  // weights-1: button sits on the push line; a single push both opens
  // the door and advances the box into it. Teaches the core mechanic.
  { id: 'weights-1', rows: [
    '#########',
    '#@ !D$ .#',
    '#########',
  ]},
  // weights-2: player must step on the button to walk through the door,
  // then push the box home.
  { id: 'weights-2', rows: [
    '##########',
    '#@   !D$.#',
    '##########',
  ]},
  // weights-3: detour chamber. Player drops the key box on the button
  // to open the chamber door, then pushes the second box through.
  { id: 'weights-3', rows: [
    '#########',
    '#@ $ .  #',
    '# ##D## #',
    '#  #!#  #',
    '# ##### #',
    '#   $  .#',
    '#########',
  ]},
  // weights-4: player must traverse door via button; box takes a loop
  // around to park on its goal.
  { id: 'weights-4', rows: [
    '##########',
    '#@ $ ! . #',
    '##### ####',
    '#   D    #',
    '#   $   .#',
    '##########',
  ]},
  // weights-5: two separate boxes used as weights in a shared chamber.
  { id: 'weights-5', rows: [
    '##########',
    '#@ $ !D .#',
    '# ########',
    '# $     .#',
    '##########',
  ]},
  // weights-6: a box already sits on its button (&); player must push
  // another box into the chamber before relocating the pre-pressed one
  // to the goal.
  { id: 'weights-6', rows: [
    '##########',
    '#@ $ D  .#',
    '##### ####',
    '#.  &    #',
    '##########',
  ]},
];

let ok = 0;
for (const c of candidates) {
  try {
    const t = Date.now();
    const path = solve(c);
    console.log(c.id, 'minSteps=', path.length, 'ms=', Date.now() - t);
    ok += 1;
  } catch (e) {
    console.log(c.id, 'FAIL', e.message);
  }
}
console.log('ok count:', ok, '/', candidates.length);
