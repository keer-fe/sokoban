import levels from '../core/levels.json' with { type: 'json' };
import { parseLevel } from '../core/rules.js';

const C = {
  sky: '#f6dfc9', sky2: '#ffe9d6', ink: '#555859', floor: '#f7efe2', floorEdge: '#d4c8b6',
  wall: '#899485', wallTop: '#a1aa99', wallSide: '#6f7a6b', crate: '#e8785e',
  crateSide: '#bd5b48', goal: '#d6a42e', white: '#fff9ef', muted: '#8e8b86', green: '#497b72'
};

const SOURCE = {
  floor: [313, 335, 621, 629], wall: [343, 334, 570, 591], wallPlain: [164, 177, 922, 930], crate: [568, 316, 390, 413], goal: [496, 233, 533, 549],
  front: [386, 140, 532, 903], right: [426, 177, 444, 836], back: [414, 143, 466, 929]
};
function sprite(ctx, image, key, x, y, w, h, flip = false) {
  if (!image?.complete && !image?.width) return false;
  const [sx, sy, sw, sh] = SOURCE[key];
  if (flip) { ctx.save(); ctx.translate(x * 2 + w, 0); ctx.scale(-1, 1); }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  if (flip) ctx.restore();
  return true;
}

function round(ctx, x, y, w, h, r, fill, stroke, line = 1) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y); ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius); ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius); ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
}
function text(ctx, value, x, y, size, color = C.ink, align = 'center', weight = 600) {
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.fillText(value, x, y);
}
function button(ctx, areas, label, x, y, w, h, action, fill = C.white, color = C.ink) {
  ctx.save();
  ctx.shadowColor = '#72574038'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 7;
  round(ctx, x, y + 4, w, h, Math.min(h / 2, 20), fill === C.white ? '#d2baa2' : '#bb6452');
  ctx.restore();
  round(ctx, x, y, w, h, Math.min(h / 2, 20), fill, fill === C.white ? '#fffdf8' : '#f99276', 1.3);
  text(ctx, label, x + w / 2, y + h / 2, Math.min(22, h * 0.38), color);
  areas.push({ x, y, w, h, action });
}
function iconButton(ctx, areas, icon, x, y, size, action) {
  ctx.save();
  ctx.shadowColor = '#80664e5c'; ctx.shadowBlur = 11; ctx.shadowOffsetY = 8;
  round(ctx, x, y + 5, size, size, size * .2, '#d3b99f');
  ctx.restore();
  round(ctx, x, y, size, size, size * .2, '#fff8eb', '#fffdf6', 1.5);
  const cx = x + size / 2, cy = y + size / 2;
  ctx.save(); ctx.fillStyle = C.ink; ctx.strokeStyle = C.ink;
  if (['up', 'right', 'down', 'left'].includes(icon)) {
    const angle = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[icon];
    ctx.translate(cx, cy); ctx.rotate(angle);
    ctx.beginPath(); ctx.moveTo(0, -size * .16); ctx.lineTo(size * .17, size * .09); ctx.quadraticCurveTo(size * .18, size * .14, size * .12, size * .14); ctx.lineTo(-size * .12, size * .14); ctx.quadraticCurveTo(-size * .18, size * .14, -size * .17, size * .09); ctx.closePath(); ctx.fill();
  } else if (icon === 'undo' || icon === 'restart') {
    ctx.lineWidth = Math.max(3, size * .065); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, size * .18, icon === 'undo' ? -2.65 : -.55, icon === 'undo' ? 2.2 : 5.6, icon === 'undo'); ctx.stroke();
    ctx.beginPath();
    if (icon === 'undo') { ctx.moveTo(cx - size * .29, cy - size * .14); ctx.lineTo(cx - size * .06, cy - size * .14); ctx.lineTo(cx - size * .24, cy - size * .31); }
    else { ctx.moveTo(cx + size * .29, cy - size * .14); ctx.lineTo(cx + size * .06, cy - size * .14); ctx.lineTo(cx + size * .24, cy - size * .31); }
    ctx.closePath(); ctx.fill();
  } else if (icon === 'hint') {
    ctx.lineWidth = Math.max(2, size * .045); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy - size * .065, size * .16, Math.PI * .1, Math.PI * .9, true); ctx.stroke();
    round(ctx, cx - size * .09, cy + size * .09, size * .18, size * .07, size * .025, C.ink);
    round(ctx, cx - size * .055, cy + size * .19, size * .11, size * .04, size * .02, C.ink);
    for (const [dx, dy] of [[0, -.32], [-.27, -.19], [.27, -.19]]) {
      ctx.beginPath(); ctx.moveTo(cx + size * dx, cy + size * dy); ctx.lineTo(cx + size * dx * 1.24, cy + size * dy * 1.23); ctx.stroke();
    }
  }
  ctx.restore();
  areas.push({ x, y, w: size, h: size, action });
}
function levelCard(ctx, images, areas, x, y, size, number, locked, done, current) {
  ctx.save();
  if (locked) ctx.globalAlpha = .55;
  if (!sprite(ctx, images[locked ? 'wallPlain' : 'floor'], locked ? 'wallPlain' : 'floor', x, y, size, size)) {
    round(ctx, x, y, size, size, size * .12, locked ? C.wall : C.floor);
  }
  ctx.restore();
  if (locked) {
    ctx.strokeStyle = '#5c625d'; ctx.lineWidth = Math.max(2, size * .045);
    ctx.beginPath(); ctx.arc(x + size * .5, y + size * .42, size * .1, Math.PI, 0); ctx.stroke();
    round(ctx, x + size * .37, y + size * .4, size * .26, size * .24, size * .035, '#697269');
  } else {
    if (current) {
      ctx.strokeStyle = '#e88465'; ctx.lineWidth = 2;
      round(ctx, x + 3, y + 3, size - 6, size - 6, size * .1, null, '#e88465', 2);
    }
    text(ctx, String(number), x + size / 2, y + size * .48, size * .32, C.ink, 'center', 700);
    if (done) {
      ctx.strokeStyle = C.goal; ctx.lineWidth = Math.max(2, size * .045);
      ctx.beginPath(); ctx.arc(x + size / 2, y + size * .77, size * .07, 0, Math.PI * 2); ctx.stroke();
    }
  }
  areas.push({ x, y, w: size, h: size, action: locked ? ['locked'] : ['level', number] });
}
function background(ctx, w, h) {
  const gradient = ctx.createRadialGradient(w * .5, h * .46, 1, w * .5, h * .46, Math.max(w, h) * .68);
  gradient.addColorStop(0, '#fff1df'); gradient.addColorStop(.7, '#fbe4d0'); gradient.addColorStop(1, '#f2d5bd');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
}
function floorTile(ctx, images, x, y, size, hasRight, hasDown, variant = 0) {
  ctx.save(); ctx.shadowColor = '#866d5440'; ctx.shadowBlur = size * .16; ctx.shadowOffsetY = size * .09;
  round(ctx, x + size * .04, y + size * .03, size * .92, size * .91, size * .08, '#ead6c0');
  ctx.restore();
  if (sprite(ctx, images.floor, 'floor', x, y, size, size, variant % 2 === 1)) return;
  const gap = Math.max(1, size * .025);
  ctx.save(); ctx.shadowColor = '#25454a2b'; ctx.shadowBlur = size * .15; ctx.shadowOffsetY = size * .11;
  round(ctx, x + gap, y + gap, size - gap * 2, size - gap * 1.4, size * .1, C.floor);
  ctx.restore();
  ctx.fillStyle = C.floorEdge;
  if (!hasDown) round(ctx, x + gap * 2, y + size - size * .12, size - gap * 4, size * .1, size * .04, C.floorEdge);
  if (!hasRight) round(ctx, x + size - size * .09, y + gap * 2, size * .07, size - gap * 4, size * .035, '#e4ded2');
}
function wallTile(ctx, images, x, y, size, variant = 0) {
  ctx.save(); ctx.shadowColor = '#574b3f5c'; ctx.shadowBlur = size * .18; ctx.shadowOffsetY = size * .1;
  round(ctx, x + size * .05, y, size * .9, size * .89, size * .07, '#7a8476');
  ctx.restore();
  const key = variant === 0 ? 'wall' : 'wallPlain';
  if (sprite(ctx, images[key], key, x, y - size * .02, size, size * 1.02, variant === 2)) return;
  ctx.save(); ctx.shadowColor = '#18363b55'; ctx.shadowBlur = size * .18; ctx.shadowOffsetY = size * .13;
  round(ctx, x + size * .04, y - size * .09, size * .92, size * .98, size * .16, C.wallSide);
  ctx.restore();
  round(ctx, x + size * .04, y - size * .13, size * .92, size * .8, size * .15, C.wallTop, '#476d70', Math.max(1, size * .025));
  ctx.fillStyle = '#ffffff1e';
  round(ctx, x + size * .14, y - size * .07, size * .72, size * .07, size * .035, '#ffffff2a');
}
function crate(ctx, images, x, y, size) {
  if (sprite(ctx, images.crate, 'crate', x + size * .11, y + size * .08, size * .78, size * .8)) return;
  const inset = size * .1;
  ctx.save(); ctx.shadowColor = '#6c3c3266'; ctx.shadowBlur = size * .2; ctx.shadowOffsetY = size * .13;
  round(ctx, x + inset, y + inset * .2, size - inset * 2, size - inset * 1.4, size * .12, C.crateSide);
  ctx.restore();
  round(ctx, x + inset, y, size - inset * 2, size - inset * 1.7, size * .12, C.crate, '#a95b48', Math.max(1, size * .035));
  ctx.strokeStyle = '#a95b48'; ctx.lineWidth = Math.max(2, size * .045);
  ctx.beginPath(); ctx.moveTo(x + size * .27, y + size * .2); ctx.lineTo(x + size * .73, y + size * .62);
  ctx.moveTo(x + size * .73, y + size * .2); ctx.lineTo(x + size * .27, y + size * .62); ctx.stroke();
}
function hero(ctx, images, facing, x, y, size, time) {
  const bob = Math.sin(time / 260) * Math.min(1.5, size * .025);
  const key = facing === 'up' ? 'back' : facing === 'right' || facing === 'left' ? 'right' : 'front';
  if (images[key]) {
    ctx.save();
    if (facing === 'left') { ctx.translate(2 * x + size, 0); ctx.scale(-1, 1); }
    sprite(ctx, images[key], key, x + size * .2, y - size * .12 + bob, size * .6, size * .98);
    ctx.restore();
    return;
  }
  ctx.save(); ctx.fillStyle = '#1d4c5050'; ctx.beginPath(); ctx.ellipse(x + size / 2, y + size * .82, size * .27, size * .08, 0, 0, Math.PI * 2); ctx.fill();
  round(ctx, x + size * .26, y + size * .21 + bob, size * .48, size * .58, size * .21, C.green, C.ink, Math.max(1, size * .03));
  round(ctx, x + size * .32, y + size * .12 + bob, size * .36, size * .34, size * .16, C.white, C.ink, Math.max(1, size * .025));
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x + size * .44, y + size * .27 + bob, size * .025, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + size * .57, y + size * .27 + bob, size * .025, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function board(ctx, images, state, facing, x, y, availableW, availableH, time) {
  const size = Math.min(availableW / state.width, availableH / state.height);
  const ox = x + (availableW - state.width * size) / 2;
  const oy = y + (availableH - state.height * size) / 2;
  const present = (at) => !state.voids.has(at);
  for (let row = 0; row < state.height; row += 1) for (let col = 0; col < state.width; col += 1) {
    const at = `${col},${row}`;
    if (!present(at)) continue;
    floorTile(ctx, images, ox + col * size, oy + row * size, size, col + 1 < state.width && present(`${col + 1},${row}`), row + 1 < state.height && present(`${col},${row + 1}`), (col * 17 + row * 13) % 3);
  }
  for (const at of state.goals) {
    const [col, row] = at.split(',').map(Number);
    const cx = ox + (col + .5) * size, cy = oy + (row + .45) * size;
    const pulse = 1 + Math.sin(time / 450) * .025;
    if (!sprite(ctx, images.goal, 'goal', cx - size * .3 * pulse, cy - size * .3 * pulse, size * .6 * pulse, size * .6 * pulse)) {
      ctx.strokeStyle = C.goal; ctx.lineWidth = Math.max(2, size * .09);
      ctx.beginPath(); ctx.arc(cx, cy, size * .23, 0, Math.PI * 2); ctx.stroke();
    }
  }
  for (let row = 0; row < state.height; row += 1) for (let col = 0; col < state.width; col += 1) {
    const at = `${col},${row}`;
    if (state.walls.has(at)) wallTile(ctx, images, ox + col * size, oy + row * size, size, (col * 7 + row * 11) % 3);
    if (state.boxes.has(at)) crate(ctx, images, ox + col * size, oy + row * size, size);
    if (state.player === at) hero(ctx, images, facing, ox + col * size, oy + row * size, size, time);
  }
  return { x: ox, y: oy, w: state.width * size, h: state.height * size };
}

const MAP_ATLAS = {
  grass: [88, 78, 494, 502], stone: [662, 78, 506, 502],
  crate: [91, 660, 478, 488], star: [662, 658, 506, 490]
};
const REFERENCE_TILES = {
  grass: [[344, 374, 123, 132]],
  stone: [[96, 373, 123, 133], [470, 373, 123, 133]],
  star: [[595, 632, 123, 142]]
};
function referenceTile(ctx, image, key, variant, x, y, width, height) {
  if (!image?.width || key === 'grass') return false;
  const options = REFERENCE_TILES[key];
  const [sx, sy, sw, sh] = options[variant % options.length];
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  return true;
}
function mapSprite(ctx, atlas, key, x, y, w, h) {
  if (!atlas?.width) return false;
  const [sx, sy, sw, sh] = MAP_ATLAS[key];
  ctx.drawImage(atlas, sx, sy, sw, sh, x, y, w, h);
  return true;
}
function mapBoard(ctx, images, state, facing, x, y, availableW, availableH, time) {
  const size = Math.min((availableW - 38) / state.width, availableH / (state.height * 1.09));
  const tileH = size * 1.09;
  const boardW = state.width * size, boardH = state.height * tileH;
  const ox = x + (availableW - boardW) / 2;
  const oy = y + (availableH - boardH) / 2;
  if (images.mapFrame?.width) ctx.drawImage(images.mapFrame, ox - 31, oy - 31, boardW + 62, boardH + 62);
  for (let row = 0; row < state.height; row += 1) for (let col = 0; col < state.width; col += 1) {
    const at = `${col},${row}`;
    if (state.voids.has(at)) continue;
    const tx = ox + col * size, ty = oy + row * tileH;
    const tile = state.walls.has(at) ? 'stone' : state.goals.has(at) ? 'star' : 'grass';
    if (!referenceTile(ctx, images.mapReference, tile, col * 7 + row * 13, tx, ty, size, tileH) && !mapSprite(ctx, images.mapAtlas, tile, tx - 1, ty - 2, size + 2, tileH + 5)) {
      round(ctx, tx, ty, size, tileH, 5, tile === 'stone' ? '#f5ba80' : '#7dd51b');
    }
  }
  for (let row = 0; row < state.height; row += 1) for (let col = 0; col < state.width; col += 1) {
    const at = `${col},${row}`;
    const tx = ox + col * size, ty = oy + row * tileH;
    if (state.boxes.has(at)) {
      if (images.mapCrate?.width) ctx.drawImage(images.mapCrate, 300, 200, 705, 775, tx + size * .01, ty - tileH * .07, size * .98, tileH * 1.06);
      else mapSprite(ctx, images.mapAtlas, 'crate', tx + size * .08, ty + tileH * .04, size * .84, tileH * .89);
    }
    if (state.player === at) {
      const image = facing === 'up' ? images.explorerBack : images.explorerRight;
      if (image?.width) {
        ctx.save();
        if (facing === 'left') { ctx.translate(2 * tx + size, 0); ctx.scale(-1, 1); }
        ctx.drawImage(image, 220, 85, 810, 1150, tx - size * .13, ty - tileH * .42, size * 1.25, tileH * 1.42);
        ctx.restore();
      } else hero(ctx, images, facing, tx - size * .2, ty - size * .4, size * 1.4, time);
    }
  }
  return { x: ox, y: oy, w: boardW, h: boardH };
}
function mapPlaque(ctx, x, y, w, h, label, fontSize = 20) {
  ctx.save(); ctx.shadowColor = '#315319aa'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 5;
  round(ctx, x, y, w, h, 17, '#097b22', '#063e1b', 2);
  ctx.restore();
  round(ctx, x + 4, y + 4, w - 8, h - 9, 13, '#c55b16', '#71300d', 2);
  round(ctx, x + 8, y + 7, w - 16, h - 17, 11, '#fff1bf', '#f8cf79', 2);
  text(ctx, label, x + w / 2, y + h * .48, fontSize, '#822608', 'center', 800);
}
function mapAction(ctx, areas, x, y, w, h, label, action, badge) {
  mapPlaque(ctx, x, y, w, h, label, 20);
  if (badge != null) {
    round(ctx, x + w - 25, y - 9, 25, 25, 13, '#f14d18', '#fff5b3', 2);
    text(ctx, String(badge), x + w - 12.5, y + 3, 14, '#fff', 'center', 800);
  }
  areas.push({ x, y, w, h, action });
}
function mapControls(ctx, images, areas, w, h) {
  const cx = w / 2, cy = h - (h < 760 ? 130 : 144), d = 53;
  if (images.mapDpad?.width) {
    ctx.drawImage(images.mapDpad, cx - 104, cy - 104, 208, 208);
    for (const [dir, dx, dy] of [['up', 0, -58], ['right', 58, 0], ['down', 0, 58], ['left', -58, 0]]) {
      areas.push({ x: cx + dx - d / 2, y: cy + dy - d / 2, w: d, h: d, action: ['move', dir] });
    }
    mapAction(ctx, areas, 14, cy - 27, 95, 55, '↶ 撤销', ['undo']);
    mapAction(ctx, areas, w - 109, cy - 27, 95, 55, '✦ 提示', ['hint']);
    return;
  }
  const base = ctx.createLinearGradient(0, cy - 78, 0, cy + 100);
  base.addColorStop(0, '#ffe447'); base.addColorStop(.55, '#ffad09'); base.addColorStop(1, '#ce5f08');
  ctx.save(); ctx.shadowColor = '#37620aaa'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 9;
  round(ctx, cx - 31, cy - 87, 62, 174, 21, '#075e21', '#063e1b', 2);
  round(ctx, cx - 87, cy - 31, 174, 62, 21, '#075e21', '#063e1b', 2);
  ctx.restore();
  round(ctx, cx - 26, cy - 82, 52, 164, 16, base, '#ffed7c', 2);
  round(ctx, cx - 82, cy - 26, 164, 52, 16, base, '#ffed7c', 2);
  round(ctx, cx - 29, cy - 29, 58, 58, 29, '#fff0aa', '#b75b15', 3);
  for (const [dir, dx, dy, angle] of [['up', 0, -58, 0], ['right', 58, 0, Math.PI / 2], ['down', 0, 58, Math.PI], ['left', -58, 0, -Math.PI / 2]]) {
    ctx.save(); ctx.translate(cx + dx, cy + dy); ctx.rotate(angle);
    ctx.shadowColor = '#88421088'; ctx.shadowOffsetY = 3; ctx.shadowBlur = 3;
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(17, 12); ctx.quadraticCurveTo(18, 16, 13, 16);
    ctx.lineTo(-13, 16); ctx.quadraticCurveTo(-18, 16, -17, 12); ctx.closePath();
    ctx.fillStyle = '#fff6ce'; ctx.fill(); ctx.strokeStyle = '#9d3a0d'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    areas.push({ x: cx + dx - d / 2, y: cy + dy - d / 2, w: d, h: d, action: ['move', dir] });
  }
  mapAction(ctx, areas, 14, cy - 27, 95, 55, '↶ 撤销', ['undo']);
  mapAction(ctx, areas, w - 109, cy - 27, 95, 55, '✦ 提示', ['hint']);
}

export function createRenderer(ctx, images = {}) {
  let areas = [];
  const homePreview = parseLevel(levels[0].rows);
  const draw = (state, width, height, time = 0) => {
    const w = width, h = height;
    areas = [];
    background(ctx, w, h);
    if (state.screen === 'home') {
      text(ctx, '箱不到八', w / 2, h * .18, 48, C.ink, 'center', 800);
      board(ctx, images, homePreview, 'down', 50, h * .3, w - 100, h * .36, time);
      button(ctx, areas, '开始游戏', 70, h * .72, w - 140, 58, ['start'], C.crate, C.white);
      button(ctx, areas, '选择关卡', 105, h * .82, w - 210, 48, ['levels']);
      button(ctx, areas, '设置', w - 88, 45, 58, 40, ['settings']);
    } else if (state.screen === 'levels') {
      button(ctx, areas, '‹', 18, 35, 48, 48, ['home']);
      text(ctx, '选择关卡', w / 2, 76, 31, C.ink, 'center', 700);
      text(ctx, `已解锁 ${state.progress.unlocked} / 24`, w / 2, 132, 16, C.muted);
      const cell = Math.min((w - 76) / 4 - 10, (h - 210) / 6 - 10);
      const gap = 12, total = cell * 4 + gap * 3, startX = (w - total) / 2, startY = h * .22;
      for (let i = 0; i < 24; i += 1) {
        const number = i + 1;
        const col = i % 4, row = Math.floor(i / 4);
        const xx = startX + col * (cell + gap), yy = startY + row * (cell + gap);
        const locked = number > state.progress.unlocked;
        const done = !!state.progress.completed[number];
        levelCard(ctx, images, areas, xx, yy, cell, number, locked, done, number === state.progress.unlocked);
      }
    } else if (state.screen === 'settings') {
      button(ctx, areas, '‹', 18, 35, 48, 48, ['closeSettings']);
      text(ctx, '设置', w / 2, h * .21, 36);
      button(ctx, areas, state.muted ? '声音：关' : '声音：开', 68, h * .35, w - 136, 62, ['mute']);
      if (state.board) button(ctx, areas, '重开本关', 68, h * .46, w - 136, 62, ['restart']);
      text(ctx, '滑动棋盘或使用方向键移动', w / 2, h * (state.board ? .62 : .51), 17, C.muted);
      text(ctx, '推箱子到所有目标点即可通关', w / 2, h * (state.board ? .67 : .56), 17, C.muted);
    } else {
      if (images.mapBackground?.width) ctx.drawImage(images.mapBackground, 0, 0, w, h);
      mapAction(ctx, areas, 18, 86, 53, 48, '☰', ['settings']);
      mapPlaque(ctx, w / 2 - 78, 86, 156, 48, `第 ${state.level} 关`, 23);
      if (state.screen === 'game' || state.screen === 'win') {
        mapPlaque(ctx, w - 112, 88, 96, 45, `步数 ${state.board.moves}`, 17);
        const boardTop = Math.max(162, h * .205) - (h < 760 ? 10 : 0);
        const boardBottom = h - (h < 760 ? 245 : 270);
        const boardArea = mapBoard(ctx, images, state.board, state.facing, 18, boardTop, w - 36, Math.max(220, boardBottom - boardTop), time);
        areas.push({ ...boardArea, action: ['board'] });
        mapControls(ctx, images, areas, w, h);
        if (state.hint) text(ctx, `提示：向${{ up: '上', right: '右', down: '下', left: '左' }[state.hint]}移动`, w / 2, h - 242, 17, '#76320a');
      }
      if (state.screen === 'win') {
        areas = [];
        ctx.fillStyle = '#173d3d99'; ctx.fillRect(0, 0, w, h);
        round(ctx, 36, h * .33, w - 72, 235, 25, C.white);
        text(ctx, '完成！', w / 2, h * .39, 36);
        text(ctx, `用了 ${state.board.moves} 步`, w / 2, h * .46, 18);
        button(ctx, areas, state.level === 24 ? '返回选关' : '下一关', 77, h * .51, w - 154, 54, state.level === 24 ? ['levels'] : ['level', state.level + 1], C.crate, C.white);
      }
    }
    return areas;
  };
  return { draw, hit(x, y) { return [...areas].reverse().find((a) => x >= a.x && y >= a.y && x <= a.x + a.w && y <= a.y + a.h)?.action; } };
}
