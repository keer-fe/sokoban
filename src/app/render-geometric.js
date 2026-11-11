import levels from '../core/levels.json' with { type: 'json' };
import { parseLevel } from '../core/rules.js';

const P = {
  bg: '#07080c', panel: '#251a19', panel2: '#3d2823', floor: '#5b3028',
  wall: '#ffae7f', wallLine: '#ffe0aa', ink: '#ffe2b8', muted: '#c29d88',
  box: '#63a6ff', boxLine: '#b5ddff', player: '#d654b8', goal: '#ffd08b',
  active: '#ffd789', shadow: '#2a191a'
};
const THEMES = [
  { wall: '#ffad7d', wallLine: '#ffe2a7', floor: '#673d2e', floorDeep: '#4c2c24',
    edge: '#9e5737', box: '#5c90df', boxLine: '#a8ceff', player: '#d658b7',
    goal: '#ffd381', panel: '#291c1a', panel2: '#493026', ink: '#ffe2b8', muted: '#cba38a', active: '#ffd183' },
  { wall: '#328cff', wallLine: '#57c4ff', floor: '#16345b', floorDeep: '#102747',
    edge: '#154773', box: '#f4ae32', boxLine: '#ffcf75', player: '#d02595',
    goal: '#75aef9', panel: '#11243f', panel2: '#194879', ink: '#e9f6ff', muted: '#92b9df', active: '#55c1ff' }
];
function theme(level) { Object.assign(P, THEMES[(level - 1) % THEMES.length]); }
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (t) => 1 - Math.pow(1 - clamp(t), 3);
const MOVE_MS = 150;
const pos = (at) => at.split(',').map(Number);
const same = (a, b) => a?.size === b?.size && [...a].every((v) => b.has(v));
function mix(a, b, t) {
  const channel = (value, shift) => (parseInt(value.slice(1), 16) >> shift) & 255;
  const part = (shift) => Math.round(channel(a, shift) * (1 - t) + channel(b, shift) * t);
  return `rgb(${part(16)},${part(8)},${part(0)})`;
}

function rect(ctx, x, y, w, h, r, fill, stroke, line = 1) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else {
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
}
function label(ctx, value, x, y, size, color = P.ink, weight = 600, align = 'center') {
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.font = `${weight} ${size}px sans-serif`; ctx.fillText(value, x, y);
}
function line(ctx, x1, y1, x2, y2, color, width = 2) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function button(ctx, areas, name, x, y, w, h, action, primary = false) {
  rect(ctx, x, y + 4, w, h, 6, P.shadow);
  rect(ctx, x, y, w, h, 6, primary ? P.active : P.panel2, primary ? P.wallLine : P.wall, 2);
  label(ctx, name, x + w / 2, y + h / 2, 17, primary ? P.shadow : P.ink, 700);
  areas.push({ x, y, w, h, action });
}
function icon(ctx, areas, name, x, y, size, action) {
  rect(ctx, x, y + 4, size, size, 5, P.shadow);
  rect(ctx, x, y, size, size, 5, P.panel2, P.wall, 2);
  const cx = x + size / 2, cy = y + size / 2;
  if (['up', 'down', 'left', 'right'].includes(name)) {
    const a = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[name];
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = P.ink; ctx.beginPath();
    ctx.moveTo(0, -size * .19); ctx.lineTo(size * .17, size * .12);
    ctx.lineTo(-size * .17, size * .12); ctx.closePath(); ctx.fill(); ctx.restore();
  } else label(ctx, name === 'undo' ? '↶' : name === 'hint' ? '✧' : name, cx, cy - 1, size * .48, P.ink, 500);
  areas.push({ x, y, w: size, h: size, action });
}
function goal(ctx, x, y, s, filled, time) {
  const d = s * .18, pulse = filled ? 0 : Math.sin(time / 550) * s * .008;
  rect(ctx, x + d - pulse, y + d - pulse, s - d * 2 + pulse * 2, s - d * 2 + pulse * 2,
    0, P.floorDeep, P.goal, Math.max(2, s * .045));
  ctx.fillStyle = P.goal;
  for (const dx of [-.12, .12]) {
    ctx.beginPath(); ctx.arc(x + s * (.5 + dx), y + s * .48, s * .043, 0, Math.PI * 2); ctx.fill();
  }
}
function box(ctx, x, y, s, goalProgress, squeeze = 0) {
  const d = s * .17, w = s - 2 * d, k = squeeze * s * .035;
  rect(ctx, x + d + s * .045, y + d + s * .07, w, w, 0, P.floorDeep);
  rect(ctx, x + d - k, y + d + k, w + 2 * k, w - 2 * k, 0,
    mix(P.box, P.goal, goalProgress), mix(P.boxLine, P.wallLine, goalProgress), Math.max(1.5, s * .035));
  rect(ctx, x + s * .27, y + s * .27, s * .46, s * .46, 0,
    P.floorDeep, mix(P.boxLine, P.wallLine, goalProgress), Math.max(1.5, s * .035));
}
function player(ctx, x, y, s, facing, squeeze = 0) {
  const cx = x + s / 2, cy = y + s / 2, r = s * (.31 + squeeze * .008);
  rect(ctx, cx - r + s * .045, cy - r + s * .075, r * 2, r * 2, 0, P.floorDeep);
  rect(ctx, cx - r, cy - r, r * 2, r * 2, 0, P.player);
  const [dx, dy] = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }[facing] || [0, 1];
  ctx.fillStyle = '#211522'; ctx.beginPath();
  ctx.arc(cx + dx * s * .05 - dy * s * .11, cy + dy * s * .05 + dx * s * .11, s * .035, 0, Math.PI * 2);
  ctx.arc(cx + dx * s * .05 + dy * s * .11, cy + dy * s * .05 - dx * s * .11, s * .035, 0, Math.PI * 2);
  ctx.fill();
}
function layout(board, x, y, w, h) {
  const s = Math.min(w / board.width, h / board.height, 54);
  return { s, x: x + (w - board.width * s) / 2, y: y + (h - board.height * s) / 2 };
}
function corridorPath(ctx, board, ox, oy, s) {
  const walkable = (col, row) => col >= 0 && row >= 0 && col < board.width && row < board.height &&
    !board.walls.has(`${col},${row}`) && !board.voids.has(`${col},${row}`);
  const edges = [], starts = new Map();
  const add = (x1, y1, x2, y2, dir) => {
    const edge = { x1, y1, x2, y2, dir, used: false };
    edges.push(edge);
    const key = `${x1},${y1}`;
    if (!starts.has(key)) starts.set(key, []);
    starts.get(key).push(edge);
  };
  for (let row = 0; row < board.height; row++) for (let col = 0; col < board.width; col++) {
    if (!walkable(col, row)) continue;
    if (!walkable(col, row - 1)) add(col, row, col + 1, row, 0);
    if (!walkable(col + 1, row)) add(col + 1, row, col + 1, row + 1, 1);
    if (!walkable(col, row + 1)) add(col + 1, row + 1, col, row + 1, 2);
    if (!walkable(col - 1, row)) add(col, row + 1, col, row, 3);
  }
  ctx.beginPath();
  for (const initial of edges) {
    if (initial.used) continue;
    const loop = [];
    let edge = initial;
    while (edge && !edge.used) {
      edge.used = true;
      loop.push([edge.x1, edge.y1]);
      const next = (starts.get(`${edge.x2},${edge.y2}`) || []).filter((item) => !item.used);
      const currentDir = edge.dir;
      edge = next.sort((a, b) => {
        const order = (dir) => [1, 0, 3, 2].indexOf((dir - currentDir + 4) % 4);
        return order(a.dir) - order(b.dir);
      })[0];
    }
    if (loop.length < 3) continue;
    const point = ([gx, gy]) => [ox + gx * s, oy + gy * s];
    const corners = loop.map((v, i) => {
      const before = loop[(i + loop.length - 1) % loop.length], after = loop[(i + 1) % loop.length];
      const [x, y] = point(v), [px, py] = point(before), [nx, ny] = point(after);
      const a = Math.min(s * .16, Math.hypot(x - px) * .35, Math.hypot(nx - x) * .35);
      const ux = (x - px) / Math.hypot(x - px, y - py), uy = (y - py) / Math.hypot(x - px, y - py);
      const vx = (nx - x) / Math.hypot(nx - x, ny - y), vy = (ny - y) / Math.hypot(nx - x, ny - y);
      return { x, y, beforeX: x - ux * a, beforeY: y - uy * a, afterX: x + vx * a, afterY: y + vy * a };
    });
    ctx.moveTo(corners[0].afterX, corners[0].afterY);
    for (let i = 1; i <= corners.length; i++) {
      const c = corners[i % corners.length];
      ctx.lineTo(c.beforeX, c.beforeY);
      ctx.quadraticCurveTo(c.x, c.y, c.afterX, c.afterY);
    }
    ctx.closePath();
  }
}
function gameBoard(ctx, board, facing, x, y, w, h, time, motion) {
  const { s, x: ox, y: oy } = layout(board, x, y, w, h);
  const bw = board.width * s, bh = board.height * s;
  rect(ctx, ox + 5, oy + 8, bw, bh, 0, P.floorDeep);
  rect(ctx, ox, oy, bw, bh, 0, P.wall);
  corridorPath(ctx, board, ox, oy, s);
  ctx.fillStyle = P.floor;
  ctx.fill();
  ctx.strokeStyle = P.edge; ctx.lineWidth = Math.max(4, s * .15); ctx.lineJoin = 'round'; ctx.stroke();
  ctx.strokeStyle = P.wallLine; ctx.lineWidth = Math.max(2, s * .07); ctx.stroke();
  // Sparse square flecks echo the original game's quiet background texture.
  ctx.fillStyle = P.floorDeep;
  for (let i = 0; i < 15; i++) {
    const fx = ox + ((i * 37 + 11) % Math.round(bw));
    const fy = oy + ((i * 71 + 23) % Math.round(bh));
    ctx.fillRect(fx, fy, Math.max(2, s * .07), Math.max(2, s * .07));
  }
  const amount = motion ? ease((time - motion.start) / MOVE_MS) : 1;
  for (const at of board.goals) {
    const [col, row] = pos(at);
    goal(ctx, ox + col * s, oy + row * s, s,
      board.boxes.has(at) && !(motion?.boxTo === at && amount < 1), time);
  }
  const movingTo = motion?.boxTo;
  for (const at of board.boxes) {
    let [col, row] = pos(at);
    if (movingTo === at) {
      const [fromCol, fromRow] = motion.boxFrom;
      col = fromCol + (col - fromCol) * amount;
      row = fromRow + (row - fromRow) * amount;
    }
    const progress = movingTo === at
      ? motion.boxFromGoal
        ? 1 - amount
        : board.goals.has(at) ? clamp((amount - .55) / .45) : 0
      : board.goals.has(at) ? 1 : 0;
    box(ctx, ox + col * s, oy + row * s, s, progress,
      movingTo === at ? Math.sin(amount * Math.PI) : 0);
  }
  let [pc, pr] = pos(board.player);
  if (motion?.playerFrom) {
    const [fc, fr] = motion.playerFrom;
    pc = fc + (pc - fc) * amount;
    pr = fr + (pr - fr) * amount;
  }
  player(ctx, ox + pc * s, oy + pr * s, s, facing, motion ? Math.sin(amount * Math.PI) : 0);
  return { x: ox, y: oy, w: board.width * s, h: board.height * s };
}
function controls(ctx, areas, w, h) {
  const cx = w / 2, cy = h - 150, d = 56;
  icon(ctx, areas, 'up', cx - d / 2, cy - 74, d, ['move', 'up']);
  icon(ctx, areas, 'left', cx - d / 2 - 68, cy - 7, d, ['move', 'left']);
  icon(ctx, areas, 'right', cx - d / 2 + 68, cy - 7, d, ['move', 'right']);
  icon(ctx, areas, 'down', cx - d / 2, cy + 60, d, ['move', 'down']);
  icon(ctx, areas, 'undo', 22, cy - 7, d, ['undo']);
  icon(ctx, areas, 'hint', w - 22 - d, cy - 7, d, ['hint']);
}
export function createRenderer(ctx) {
  let areas = [], motion = null, lastTime = 0;
  const preview = parseLevel(levels[0].rows);
  function transition(before, after) {
    if (!before || before.level !== after.level || !after.board) { motion = null; return; }
    const board = after.board;
    let boxFrom = null, boxTo = null;
    if (!same(before.boxes, board.boxes)) {
      boxFrom = [...before.boxes].find((at) => !board.boxes.has(at));
      boxTo = [...board.boxes].find((at) => !before.boxes.has(at));
    }
    const previous = motion;
    const previousAmount = previous ? ease((lastTime - previous.start) / MOVE_MS) : 1;
    const playerAt = pos(before.player);
    const playerFrom = previous?.playerTo === before.player
      ? previous.playerFrom.map((value, i) => value + (playerAt[i] - value) * previousAmount)
      : playerAt;
    let boxFromPoint = boxFrom ? pos(boxFrom) : null;
    if (boxFrom && previous?.boxTo === boxFrom) {
      boxFromPoint = previous.boxFrom.map((value, i) =>
        value + (boxFromPoint[i] - value) * previousAmount);
    }
    motion = { start: lastTime, playerFrom, playerTo: board.player, boxFrom: boxFromPoint, boxTo,
      boxFromGoal: boxFrom ? board.goals.has(boxFrom) : false };
  }
  function draw(state, w, h, time = 0) {
    lastTime = time;
    areas = [];
    theme(state.level || 1);
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4a4650';
    for (let i = 0; i < 22; i++) ctx.fillRect((i * 97 + 17) % w, (i * 149 + 37) % h, i % 4 + 2, i % 4 + 2);
    if (state.screen === 'home') {
      label(ctx, '箱不到八', w / 2, h * .16, 42, P.ink, 800);
      label(ctx, '把每一步，推到恰好', w / 2, h * .22, 15, P.muted, 500);
      gameBoard(ctx, preview, 'down', 28, h * .32, w - 56, h * .34, time, null);
      button(ctx, areas, '开始游戏', 62, h * .74, w - 124, 56, ['start'], true);
      button(ctx, areas, '选择关卡', 90, h * .83, w - 180, 48, ['levels']);
      icon(ctx, areas, '⚙', w - 69, 38, 44, ['settings']);
    } else if (state.screen === 'levels') {
      icon(ctx, areas, '‹', 20, 35, 46, ['home']);
      label(ctx, '选择关卡', w / 2, 73, 29, P.ink, 700);
      label(ctx, `已解锁 ${state.progress.unlocked} / 24`, w / 2, 125, 15, P.muted);
      const size = Math.min((w - 82) / 4 - 7, (h - 220) / 6 - 9);
      const gap = 11, left = (w - (size * 4 + gap * 3)) / 2, top = h * .22;
      for (let i = 0; i < 24; i++) {
        const n = i + 1, xx = left + (i % 4) * (size + gap), yy = top + Math.floor(i / 4) * (size + gap);
        const locked = n > state.progress.unlocked, done = !!state.progress.completed[n];
        rect(ctx, xx, yy + 3, size, size, 4, P.shadow);
        rect(ctx, xx, yy, size, size, 4, locked ? P.panel2 : done ? P.goal : P.wall,
          locked ? P.edge : P.wallLine, 1.8);
        label(ctx, locked ? '·' : String(n), xx + size / 2, yy + size / 2,
          size * .34, locked ? P.muted : P.floorDeep, 700);
        areas.push({ x: xx, y: yy, w: size, h: size, action: locked ? ['locked'] : ['level', n] });
      }
    } else if (state.screen === 'settings') {
      icon(ctx, areas, '‹', 20, 35, 46, ['closeSettings']);
      label(ctx, '设置', w / 2, h * .22, 34);
      button(ctx, areas, state.muted ? '声音：关' : '声音：开', 65, h * .35, w - 130, 58, ['mute']);
      if (state.board) button(ctx, areas, '重开本关', 65, h * .46, w - 130, 58, ['restart']);
      label(ctx, '滑动棋盘或使用方向键移动', w / 2, h * .64, 15, P.muted);
      label(ctx, '把所有箱子推到目标点', w / 2, h * .69, 15, P.muted);
    } else if (state.board) {
      icon(ctx, areas, '☰', 20, 42, 48, ['settings']);
      label(ctx, `第 ${state.level} 关`, w / 2, 66, 27, P.ink, 700);
      label(ctx, `步数 ${state.board.moves}`, w - 22, 68, 16, P.muted, 600, 'right');
      const top = Math.max(138, h * .18), bottom = h - 320;
      const boardArea = gameBoard(ctx, state.board, state.facing, 18, top, w - 36, Math.max(170, bottom - top), time, motion);
      areas.push({ ...boardArea, action: ['board'] });
      controls(ctx, areas, w, h);
      if (state.hint) label(ctx, `提示：向${{ up: '上', right: '右', down: '下', left: '左' }[state.hint]}移动`, w / 2, h - 265, 16, P.goal);
      if (state.screen === 'win' && (!motion || time - motion.start >= MOVE_MS + 120)) {
        areas = [];
        ctx.fillStyle = '#08131bba'; ctx.fillRect(0, 0, w, h);
        rect(ctx, 28, h * .34, w - 56, 222, 22, P.panel, '#668879', 1.5);
        label(ctx, '完成！', w / 2, h * .40, 33, P.active, 700);
        label(ctx, `用了 ${state.board.moves} 步`, w / 2, h * .47, 17, P.muted);
        button(ctx, areas, state.level === 24 ? '返回选关' : '下一关',
          75, h * .52, w - 150, 51, state.level === 24 ? ['levels'] : ['level', state.level + 1], true);
      }
    }
    if (motion && time - motion.start >= MOVE_MS + 120) motion = null;
    return areas;
  }
  return { draw, transition, isMoving(time = lastTime) { return !!motion && time - motion.start < MOVE_MS; },
    hit(x, y) { return [...areas].reverse().find((a) =>
    x >= a.x && y >= a.y && x <= a.x + a.w && y <= a.y + a.h)?.action; } };
}
