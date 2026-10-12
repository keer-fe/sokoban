import { levels } from '../src/game/levels.js';
import { parseLevel, transition, isComplete } from '../src/game/engine.js';

const DIRS = ['up', 'down', 'left', 'right'];
const DVEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const DCHAR = { up: 'U', down: 'D', left: 'L', right: 'R' };
const CHAR_TO_DIR = { U: 'up', D: 'down', L: 'left', R: 'right' };

function neighbor(board, pos, dir) {
  const [dx, dy] = DVEC[dir];
  const x = (pos % board.width) + dx;
  const y = Math.floor(pos / board.width) + dy;
  if (x < 0 || x >= board.width || y < 0 || y >= board.height) return -1;
  return y * board.width + x;
}

// Backward reachability from goals using reverse push: cells from which a lone box can reach some goal.
function computeLive(board) {
  const live = new Set(board.goals);
  const stack = [...board.goals];
  while (stack.length) {
    const g = stack.pop();
    for (const dir of DIRS) {
      const prev = neighbor(board, g, OPP[dir]);
      const playerCell = neighbor(board, prev, OPP[dir]);
      if (prev >= 0 && playerCell >= 0 && board.floors.has(prev) && board.floors.has(playerCell) && !live.has(prev)) {
        live.add(prev);
        stack.push(prev);
      }
    }
  }
  return live;
}

// Multi-source BFS distance from goals to every floor cell (ignoring boxes). Admissible per-box lower bound.
function goalDistance(board) {
  const dist = new Map();
  const q = [];
  for (const g of board.goals) { dist.set(g, 0); q.push(g); }
  let head = 0;
  while (head < q.length) {
    const p = q[head++];
    const d = dist.get(p);
    for (const dir of DIRS) {
      const n = neighbor(board, p, dir);
      if (n < 0 || !board.floors.has(n) || dist.has(n)) continue;
      dist.set(n, d + 1);
      q.push(n);
    }
  }
  return dist;
}

function playerReach(board, player, boxSet) {
  const dist = new Int32Array(board.width * board.height).fill(-1);
  dist[player] = 0;
  const parent = new Int32Array(board.width * board.height).fill(-1);
  const parentDir = new Uint8Array(board.width * board.height);
  const q = [player];
  let head = 0;
  while (head < q.length) {
    const p = q[head++];
    const d = dist[p];
    for (let di = 0; di < 4; di++) {
      const dir = DIRS[di];
      const n = neighbor(board, p, dir);
      if (n < 0 || !board.floors.has(n) || boxSet.has(n) || dist[n] >= 0) continue;
      dist[n] = d + 1;
      parent[n] = p;
      parentDir[n] = di;
      q.push(n);
    }
  }
  return { dist, parent, parentDir };
}

function reconstructWalk(reach, from, to) {
  if (from === to) return '';
  let cur = to;
  const parts = [];
  while (cur !== from) {
    parts.push(DCHAR[DIRS[reach.parentDir[cur]]]);
    cur = reach.parent[cur];
  }
  parts.reverse();
  return parts.join('');
}

function isSimpleFrozen(board, pos) {
  const up = neighbor(board, pos, 'up');
  const down = neighbor(board, pos, 'down');
  const left = neighbor(board, pos, 'left');
  const right = neighbor(board, pos, 'right');
  const vBlocked = (up < 0 || !board.floors.has(up)) && (down < 0 || !board.floors.has(down));
  const hBlocked = (left < 0 || !board.floors.has(left)) && (right < 0 || !board.floors.has(right));
  return vBlocked && hBlocked;
}

function heuristic(boxes, gdist, goals) {
  let h = 0;
  for (const b of boxes) {
    if (goals.has(b)) continue;
    const d = gdist.get(b);
    if (d === undefined) return Infinity;
    h += d;
  }
  return h;
}

function heapPush(heap, node) {
  heap.push(node);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heap[p].f > heap[i].f || (heap[p].f === heap[i].f && heap[p].g < heap[i].g)) {
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    } else break;
  }
}
function heapPop(heap) {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length) {
    heap[0] = last;
    let i = 0;
    const n = heap.length;
    while (true) {
      const l = 2 * i + 1, r = 2 * i + 2;
      let m = i;
      if (l < n && (heap[l].f < heap[m].f || (heap[l].f === heap[m].f && heap[l].g > heap[m].g))) m = l;
      if (r < n && (heap[r].f < heap[m].f || (heap[r].f === heap[m].f && heap[r].g > heap[m].g))) m = r;
      if (m !== i) { [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } else break;
    }
  }
  return top;
}

export function solveAdvanced(level, { maxStates = 3_000_000, maxMs = 60_000 } = {}) {
  const started = Date.now();
  const board = parseLevel(level);
  const live = computeLive(board);
  const gdist = goalDistance(board);
  const initBoxes = [...board.boxes].sort((a, b) => a - b);
  for (const b of initBoxes) {
    if (!live.has(b) && !board.goals.has(b)) throw new Error(`Dead start box: ${level.id}`);
  }
  const h0 = heuristic(initBoxes, gdist, board.goals);
  const heap = [];
  const best = new Map();
  const startKey = board.player + ':' + initBoxes.join(',');
  best.set(startKey, 0);
  heapPush(heap, { g: 0, f: h0, player: board.player, boxes: initBoxes, path: '' });

  let expansions = 0;
  while (heap.length) {
    const node = heapPop(heap);
    if (++expansions % 20000 === 0) {
      if (Date.now() - started > maxMs || expansions > maxStates) {
        throw new Error(`Advanced solver budget exceeded (exp=${expansions}, open=${heap.length}): ${level.id}`);
      }
    }
    if (node.boxes.every((b) => board.goals.has(b))) {
      const path = [];
      for (const c of node.path) path.push(CHAR_TO_DIR[c]);
      return path;
    }
    const kcur = node.player + ':' + node.boxes.join(',');
    if (best.get(kcur) < node.g) continue;
    const boxSet = new Set(node.boxes);
    const reach = playerReach(board, node.player, boxSet);
    for (let bi = 0; bi < node.boxes.length; bi++) {
      const b = node.boxes[bi];
      for (const dir of DIRS) {
        const target = neighbor(board, b, dir);
        if (target < 0 || !board.floors.has(target) || boxSet.has(target)) continue;
        if (!live.has(target) && !board.goals.has(target)) continue;
        const pushFrom = neighbor(board, b, OPP[dir]);
        if (pushFrom < 0 || reach.dist[pushFrom] < 0) continue;
        if (!board.goals.has(target) && isSimpleFrozen(board, target)) continue;
        const walkCost = reach.dist[pushFrom];
        const newG = node.g + walkCost + 1;
        const newBoxes = node.boxes.slice();
        newBoxes[bi] = target;
        newBoxes.sort((a, b) => a - b);
        const newKey = b + ':' + newBoxes.join(',');
        const prev = best.get(newKey);
        if (prev !== undefined && prev <= newG) continue;
        best.set(newKey, newG);
        const walkStr = reconstructWalk(reach, node.player, pushFrom);
        const newPath = node.path + walkStr + DCHAR[dir];
        const h = heuristic(newBoxes, gdist, board.goals);
        if (!Number.isFinite(h)) continue;
        heapPush(heap, { g: newG, f: newG + h, player: b, boxes: newBoxes, path: newPath });
      }
    }
  }
  throw new Error(`Unsolvable: ${level.id}`);
}

// Verify a path replays cleanly on the shared engine.
export function verify(level, path) {
  const board = parseLevel(level);
  let state = { player: board.player, boxes: [...board.boxes], steps: 0 };
  for (const dir of path) {
    const next = transition(board, state, dir);
    if (!next) return false;
    state = next;
  }
  return isComplete(board, state);
}

if (process.argv[1] && import.meta.url.endsWith('/' + process.argv[1].split('/').pop())) {
  const maxStates = Number(process.env.SOLVER_MAX_STATES || 4_000_000);
  const maxMs = Number(process.env.SOLVER_MAX_MS || 60_000);
  const only = process.env.SOLVER_ONLY ? new Set(process.env.SOLVER_ONLY.split(',').map(Number)) : null;
  const skip = process.env.SOLVER_SKIP ? new Set(process.env.SOLVER_SKIP.split(',').map(Number)) : new Set();
  for (const level of levels) {
    if (only && !only.has(level.sourceNumber)) continue;
    if (skip.has(level.sourceNumber)) continue;
    const started = Date.now();
    try {
      const path = solveAdvanced(level, { maxStates, maxMs });
      const ok = verify(level, path);
      console.log(JSON.stringify({ sourceNumber: level.sourceNumber, boxCount: level.boxCount, minSteps: path.length, ms: Date.now() - started, ok }));
    } catch (error) {
      console.log(JSON.stringify({ sourceNumber: level.sourceNumber, boxCount: level.boxCount, pending: true, ms: Date.now() - started, reason: error.message }));
    }
  }
}
