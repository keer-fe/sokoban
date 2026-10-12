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

// Push-distance from a specific goal: pull BFS, state = box cell + player side (approximate: ignore player, assume reachable).
// We use multi-source push-aware BFS: a cell c has pushDist(c, g) if there's a pull sequence from g to c (same reversibility as pushes).
function pushDistancesFromGoal(board, goal) {
  const dist = new Map();
  dist.set(goal, 0);
  const q = [goal];
  let head = 0;
  while (head < q.length) {
    const p = q[head++];
    const d = dist.get(p);
    for (const dir of DIRS) {
      const prev = neighbor(board, p, OPP[dir]);
      const playerCell = neighbor(board, prev, OPP[dir]);
      if (prev >= 0 && playerCell >= 0 && board.floors.has(prev) && board.floors.has(playerCell) && !dist.has(prev)) {
        dist.set(prev, d + 1);
        q.push(prev);
      }
    }
  }
  return dist;
}

function playerReach(board, player, boxSet) {
  const N = board.width * board.height;
  const dist = new Int32Array(N).fill(-1);
  const parent = new Int32Array(N).fill(-1);
  const parentDir = new Uint8Array(N);
  dist[player] = 0;
  const q = [player];
  let head = 0;
  while (head < q.length) {
    const p = q[head++];
    for (let di = 0; di < 4; di++) {
      const dir = DIRS[di];
      const n = neighbor(board, p, dir);
      if (n < 0 || !board.floors.has(n) || boxSet.has(n) || dist[n] >= 0) continue;
      dist[n] = dist[p] + 1;
      parent[n] = p;
      parentDir[n] = di;
      q.push(n);
    }
  }
  // minimal reachable cell as canonical representative
  let minReach = -1;
  for (let i = 0; i < N; i++) if (dist[i] >= 0 && (minReach < 0 || i < minReach)) minReach = i;
  return { dist, parent, parentDir, minReach };
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

// Freeze deadlock: a non-goal box permanently stuck because both axes are blocked by walls/dead cells/frozen boxes.
function isFrozenDeadlock(board, boxSet, live, pos) {
  if (board.goals.has(pos)) return false;
  const visited = new Set();
  function blockedAxis(p, axis, trail) {
    // axis 0: horizontal (left/right), axis 1: vertical (up/down)
    const dirs = axis === 0 ? ['left', 'right'] : ['up', 'down'];
    let blockedCount = 0;
    for (const d of dirs) {
      const n = neighbor(board, p, d);
      if (n < 0 || !board.floors.has(n)) { blockedCount++; continue; }
      if (!live.has(n) && !boxSet.has(n)) { blockedCount++; continue; }
      if (boxSet.has(n)) {
        if (trail.has(n)) { blockedCount++; continue; }
        // tentatively mark; a box is frozen if its other axis is also blocked (recursive)
        const t = new Set(trail); t.add(n);
        const otherAxis = axis ^ 1;
        if (blockedAxis(n, otherAxis, t) && blockedAxis(n, axis, t)) blockedCount++;
      }
    }
    return blockedCount === 2;
  }
  const trail = new Set([pos]);
  return blockedAxis(pos, 0, trail) && blockedAxis(pos, 1, trail);
}

// Hungarian algorithm (O(n^3)) for minimum assignment on cost matrix NxM (pad with large if N<M).
function hungarian(cost) {
  const n = cost.length;
  if (n === 0) return 0;
  const m = cost[0].length;
  const INF = 1e15;
  const u = new Array(n + 1).fill(0);
  const v = new Array(m + 1).fill(0);
  const p = new Array(m + 1).fill(0);
  const way = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(m + 1).fill(INF);
    const used = new Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF;
      let j1 = -1;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  let total = 0;
  for (let j = 1; j <= m; j++) if (p[j]) total += cost[p[j] - 1][j - 1];
  return total;
}

function heapPush(heap, node) {
  heap.push(node);
  let i = heap.length - 1;
  while (i > 0) {
    const par = (i - 1) >> 1;
    if (heap[par].f > heap[i].f || (heap[par].f === heap[i].f && heap[par].g < heap[i].g)) {
      [heap[par], heap[i]] = [heap[i], heap[par]];
      i = par;
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

export function solve(level, { maxStates = 3_000_000, maxMs = 60_000, maxOpen = 2_000_000 } = {}) {
  const started = Date.now();
  const board = parseLevel(level);
  const live = computeLive(board);
  const goalsArr = [...board.goals];
  const goalDistTables = goalsArr.map((g) => pushDistancesFromGoal(board, g));
  const initBoxes = [...board.boxes].sort((a, b) => a - b);
  for (const b of initBoxes) {
    if (!live.has(b) && !board.goals.has(b)) throw new Error(`Dead start box: ${level.id}`);
  }

  function heuristic(boxes) {
    const n = boxes.length;
    const cost = [];
    for (let i = 0; i < n; i++) {
      const row = new Array(goalsArr.length);
      for (let j = 0; j < goalsArr.length; j++) {
        const d = goalDistTables[j].get(boxes[i]);
        row[j] = d === undefined ? 1e9 : d;
      }
      cost.push(row);
    }
    const h = hungarian(cost);
    return h >= 1e9 ? Infinity : h;
  }

  const h0 = heuristic(initBoxes);
  if (!Number.isFinite(h0)) throw new Error(`Unsolvable init: ${level.id}`);

  const heap = [];
  const best = new Map();
  const startKey = board.player + ':' + initBoxes.join(',');
  best.set(startKey, 0);
  heapPush(heap, { g: 0, f: h0, player: board.player, boxes: initBoxes, path: '' });

  let expansions = 0;
  while (heap.length) {
    if (heap.length > maxOpen) throw new Error(`Open limit exceeded (open=${heap.length}): ${level.id}`);
    const node = heapPop(heap);
    if (++expansions % 10000 === 0) {
      if (Date.now() - started > maxMs || expansions > maxStates) {
        throw new Error(`Budget exceeded (exp=${expansions}, open=${heap.length}): ${level.id}`);
      }
    }
    if (node.boxes.every((b) => board.goals.has(b))) {
      const path = [];
      for (const c of node.path) path.push(CHAR_TO_DIR[c]);
      return path;
    }
    const boxSet = new Set(node.boxes);
    const curKey = node.player + ':' + node.boxes.join(',');
    if (best.get(curKey) < node.g) continue;
    const reach = playerReach(board, node.player, boxSet);
    for (let bi = 0; bi < node.boxes.length; bi++) {
      const b = node.boxes[bi];
      for (const dir of DIRS) {
        const target = neighbor(board, b, dir);
        if (target < 0 || !board.floors.has(target) || boxSet.has(target)) continue;
        if (!live.has(target) && !board.goals.has(target)) continue;
        const pushFrom = neighbor(board, b, OPP[dir]);
        if (pushFrom < 0 || reach.dist[pushFrom] < 0) continue;
        // apply move tentatively to new box set
        const newBoxes = node.boxes.slice();
        newBoxes[bi] = target;
        newBoxes.sort((a, b) => a - b);
        const newBoxSet = new Set(newBoxes);
        if (isFrozenDeadlock(board, newBoxSet, live, target)) continue;
        const walkCost = reach.dist[pushFrom];
        const newG = node.g + walkCost + 1;
        const newKey = b + ':' + newBoxes.join(',');
        const prev = best.get(newKey);
        if (prev !== undefined && prev <= newG) continue;
        best.set(newKey, newG);
        const walkStr = reconstructWalk(reach, node.player, pushFrom);
        const newPath = node.path + walkStr + DCHAR[dir];
        const h = heuristic(newBoxes);
        if (!Number.isFinite(h)) continue;
        heapPush(heap, { g: newG, f: newG + h, player: b, boxes: newBoxes, path: newPath });
      }
    }
  }
  throw new Error(`Unsolvable: ${level.id}`);
}

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
  const maxOpen = Number(process.env.SOLVER_MAX_OPEN || 2_000_000);
  const only = process.env.SOLVER_ONLY ? new Set(process.env.SOLVER_ONLY.split(',').map(Number)) : null;
  const skip = process.env.SOLVER_SKIP ? new Set(process.env.SOLVER_SKIP.split(',').map(Number)) : new Set();
  for (const level of levels) {
    if (only && !only.has(level.sourceNumber)) continue;
    if (skip.has(level.sourceNumber)) continue;
    const started = Date.now();
    try {
      const path = solve(level, { maxStates, maxMs, maxOpen });
      const ok = verify(level, path);
      console.log(JSON.stringify({ sourceNumber: level.sourceNumber, boxCount: level.boxCount, minSteps: path.length, ms: Date.now() - started, ok }));
    } catch (error) {
      console.log(JSON.stringify({ sourceNumber: level.sourceNumber, boxCount: level.boxCount, pending: true, ms: Date.now() - started, reason: error.message }));
    }
  }
}
