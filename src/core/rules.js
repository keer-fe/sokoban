export const DIRS = Object.freeze({ up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] });

export function parseLevel(rows) {
  if (!rows.length || rows.some((row) => row.length !== rows[0].length)) throw new Error('Invalid rectangular level');
  const walls = new Set(), voids = new Set(), goals = new Set(), boxes = new Set();
  let player = null;
  rows.forEach((row, y) => [...row].forEach((cell, x) => {
    const at = `${x},${y}`;
    if (cell === '#') walls.add(at);
    if (cell === '~') voids.add(at);
    if (cell === '.' || cell === '*' || cell === '+') goals.add(at);
    if (cell === '$' || cell === '*') boxes.add(at);
    if (cell === '@' || cell === '+') {
      if (player) throw new Error('Level has multiple players');
      player = at;
    }
    if (!'#~ .$*@+'.includes(cell)) throw new Error(`Unknown cell: ${cell}`);
  }));
  if (!player || !goals.size || boxes.size !== goals.size) throw new Error('Invalid player, goals, or boxes');
  return { width: rows[0].length, height: rows.length, walls, voids, goals, boxes, player, moves: 0, pushes: 0, history: [] };
}

export function offset(at, dx, dy) {
  const [x, y] = at.split(',').map(Number);
  return `${x + dx},${y + dy}`;
}

export function isWon(state) {
  return [...state.boxes].every((box) => state.goals.has(box));
}

export function isWalkable(state, at) {
  const [x, y] = at.split(',').map(Number);
  return x >= 0 && y >= 0 && x < state.width && y < state.height && !state.walls.has(at) && !state.voids.has(at);
}

export function move(state, direction) {
  const vector = DIRS[direction];
  if (!vector) return false;
  const next = offset(state.player, ...vector);
  if (!isWalkable(state, next)) return false;
  let beyond = null;
  if (state.boxes.has(next)) {
    beyond = offset(next, ...vector);
    if (!isWalkable(state, beyond) || state.boxes.has(beyond)) return false;
  }
  state.history.push({ player: state.player, boxes: beyond ? [next, beyond] : null });
  state.player = next;
  state.moves += 1;
  if (beyond) {
    state.boxes.delete(next);
    state.boxes.add(beyond);
    state.pushes += 1;
  }
  return true;
}

export function undo(state) {
  const entry = state.history.pop();
  if (!entry) return false;
  state.player = entry.player;
  state.moves -= 1;
  if (entry.boxes) {
    state.boxes.delete(entry.boxes[1]);
    state.boxes.add(entry.boxes[0]);
    state.pushes -= 1;
  }
  return true;
}
