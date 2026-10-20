import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { levels } from './fixtures/levels.js';
import { areDoorsOpen, GameSession, score } from '../src/game/engine.js';
import { solve } from '../tools/solve-levels.js';
import { GameController } from '../src/game/controller.js';
import { ProgressStore } from '../src/game/progress.js';
import { createViewport } from '../src/core/viewport.js';
import { directionPadSource, drawDirectionPad, drawGameBackground, drawGameGround,
  gameAssetFileIDs, gameBackgroundSource, GamePage, stepsCardSource,
  undoCardSource } from '../src/pages/game/index.js';
import { Modal, settingIconFileIDs, settingIconSources } from '../src/ui/modal.js';

function platform() {
  const data = new Map();
  const messages = [];
  return { messages, wallNow: () => Date.parse('2026-10-12T08:00:00Z'),
    notify: (message) => messages.push(message), readStorage: (key) => data.get(key),
    writeStorage: (key, value) => data.set(key, JSON.parse(JSON.stringify(value))) };
}

test('游戏背景使用透明美术遮罩，底层方格与地图单格同尺寸并对齐', () => {
  assert.match(gameBackgroundSource, /\/images\/generated\/game-layout-mask-v2\.png$/);
  const config = JSON.parse(readFileSync(new URL('../project.config.json', import.meta.url)));
  const included = config.packOptions.include.map(({ value }) => value);
  assert.equal(included.includes(gameBackgroundSource), false);
  assert.match(gameAssetFileIDs.background, /^cloud:\/\//);
  const fills = [];
  const curves = [];
  const starts = [];
  const ctx = new Proxy({
    fill: () => fills.push(true),
    quadraticCurveTo: (...args) => curves.push(args),
    moveTo: (...args) => starts.push(args),
  }, {
    get: (target, key) => target[key] || (() => {}),
    set: (target, key, value) => { target[key] = value; return true; },
  });
  drawGameGround(ctx, 414, 844, 52, 31, 117);
  assert.ok(fills.length > 60);
  assert.equal(curves.length, fills.length * 4);
  assert.ok(Math.abs(starts[0][0] + 15.28) < 1e-9);
  assert.equal(starts[0][1], -39);
  assert.equal(starts[1][0] - starts[0][0], 52);
  assert.equal(starts[1][1], -39);
});

test('游戏背景完整绘制原图，仅按屏幕高度纵向拉伸', () => {
  const calls = [];
  const image = { width: 941, height: 1672 };
  assert.equal(drawGameBackground({ drawImage: (...args) => calls.push(args) },
    { image, ready: true }, 414, 844), true);
  assert.deepEqual(calls[0], [image, 0, 0, 941, 1672, 0, 0, 414, 844]);
});

test('操作盘按下方向时绘制内凹、描边和高光反馈', () => {
  const calls = { arc: [], fill: 0, stroke: 0 };
  const ctx = new Proxy({
    drawImage: () => {},
    arc: (...args) => calls.arc.push(args),
    fill: () => { calls.fill++; },
    stroke: () => { calls.stroke++; },
  }, {
    get: (target, key) => target[key] || (() => {}),
    set: (target, key, value) => { target[key] = value; return true; },
  });
  assert.equal(drawDirectionPad(ctx, { ready: true, image: {} },
    { x: 200, y: 600, width: 156, height: 156 },
    { x: 254, y: 600, width: 48, height: 48 }), true);
  assert.equal(calls.arc.length, 3);
  assert.equal(calls.fill, 2);
  assert.equal(calls.stroke, 1);
});

test('全部体验关卡可解，最少步数通过逐步 BFS 验证', () => {
  levels.forEach((level) => {
    const path = solve(level);
    assert.equal(path.length, level.minSteps);
    const game = new GameSession(level);
    path.forEach((direction) => assert.equal(game.move(direction), true));
    assert.equal(game.complete, true);
    assert.equal(game.state.steps, path.length);
    assert.equal(game.move('down'), false);
  });
});

test('四向移动更新朝向，撤销恢复朝向，重开朝下，撞墙不改变状态', () => {
  const game = new GameSession({ id: 'facing', rows: ['#######', '#     #', '#  @  #', '# $ . #', '#######'] });
  assert.equal(game.state.facing, 'down');
  for (const direction of ['up', 'right', 'down', 'left']) {
    assert.equal(game.move(direction), true);
    assert.equal(game.state.facing, direction);
  }
  assert.equal(game.undo(), true);
  assert.equal(game.state.facing, 'down');
  game.restart();
  assert.equal(game.state.facing, 'down');
  game.move('up');
  const before = game.state;
  assert.equal(game.move('up'), false);
  assert.equal(game.state, before);
});

test('地图人物每走一步只切换一帧，静止时保持当前帧', () => {
  const c = new GameController(platform(), levels);
  c.openLevel(0);
  const page = new GamePage(c, () => {});
  page.resize(createViewport({ width: 390, height: 844 }));
  const ctx = new Proxy({}, {
    get: (_, key) => key === 'measureText' ? () => ({ width: 0 }) : () => {},
    set: () => true,
  });

  page.render(ctx, 0);
  assert.deepEqual(page.playerPose, { kind: 'walk', frame: 1 });
  c.game.move('up');
  page.render(ctx, 0.01);
  assert.deepEqual(page.playerPose, { kind: 'push', frame: 2 });
  page.render(ctx, 10);
  assert.deepEqual(page.playerPose, { kind: 'push', frame: 2 });
  c.game.move('left');
  page.render(ctx, 10.01);
  assert.deepEqual(page.playerPose, { kind: 'walk', frame: 0 });
});

test('撞墙和连箱无效；撤销恢复箱子和步数；重开清空历史', () => {
  const game = new GameSession(levels[0]);
  const initial = JSON.parse(JSON.stringify(game.state));
  assert.equal(game.move('down'), false);
  assert.equal(game.state.steps, 0);
  assert.equal(game.history.length, 0);
  game.move('up'); assert.equal(game.state.steps, 1);
  game.undo(); assert.deepEqual(game.state, initial);
  game.move('left'); game.restart();
  assert.deepEqual(game.state, initial);
  assert.equal(game.history.length, 0);
  const blocked = new GameSession({ id: 'blocked', rows: ['######', '#@$$.#', '# .  #', '######'] });
  assert.equal(blocked.move('right'), false);
  assert.equal(blocked.state.steps, 0);
});

test('按钮控制门，角色和箱子都能保持门开启，撤销恢复机关状态', () => {
  const playerSwitch = new GameSession({ id: 'player-switch',
    rows: ['########', '#@ !D$.#', '########'] });
  assert.equal(playerSwitch.move('right'), true);
  assert.equal(playerSwitch.move('right'), true);
  assert.equal(areDoorsOpen(playerSwitch.board, playerSwitch.state), true);
  assert.equal(playerSwitch.move('right'), true);
  assert.equal(areDoorsOpen(playerSwitch.board, playerSwitch.state), false);
  assert.equal(playerSwitch.undo(), true);
  assert.equal(areDoorsOpen(playerSwitch.board, playerSwitch.state), true);

  const boxSwitch = new GameSession({ id: 'box-switch',
    rows: ['#########', '#@$!.#  #', '#    D$.#', '#    #  #', '#    #  #', '#########'] });
  assert.equal(boxSwitch.move('right'), true);
  assert.equal(areDoorsOpen(boxSwitch.board, boxSwitch.state), true);
  assert.equal(boxSwitch.board.buttons.has(boxSwitch.state.boxes[0]), true);
});

test('评分边界、最高星级和最佳步数独立保存，损坏存档回退', () => {
  assert.deepEqual([score(30, 20), score(31, 20), score(40, 20), score(41, 20)], [3, 2, 2, 1]);
  const p = platform();
  const store = new ProgressStore(p, levels);
  store.finish(levels[0], 5, 3); store.finish(levels[0], 20, 1);
  const restored = new ProgressStore(p, levels);
  assert.deepEqual(restored.state.records[levels[0].id], { bestSteps: 5, stars: 3 });
  assert.equal(restored.unlocked, 1);
  assert.equal(restored.allComplete, false);
  const broken = new ProgressStore({ ...p, readStorage: () => ({ cards: -1, records: { 'intro-1': { stars: 9, bestSteps: -5 } } }) }, levels);
  assert.equal(broken.state.cards, 0); assert.equal(broken.unlocked, 0);
});

test('导航、弹窗阻断、撤销卡、重开和完整通关流程', () => {
  const p = platform(); const c = new GameController(p, levels);
  c.handle('level:1'); assert.equal(c.route, 'home');
  c.handle('start'); assert.equal(c.modal, 'tutorial');
  c.handle('up'); assert.equal(c.game.state.steps, 0);
  c.handle('skip'); c.handle('undo'); assert.equal(c.modal, null);
  c.handle('up'); c.handle('undo'); assert.equal(c.modal, 'cards');
  c.handle('up'); assert.equal(c.game.state.steps, 1);
  c.handle('claim'); assert.equal(c.modal, 'cards');
  c.progress.commit({ ...c.progress.state, cards: 1 });
  c.handle('close'); c.handle('undo'); assert.equal(c.game.state.steps, 0);
  assert.equal(c.progress.state.cards, 0);
  c.handle('up'); c.handle('menu'); c.handle('down'); assert.equal(c.game.state.steps, 1);
  c.handle('restart'); assert.equal(c.game.state.steps, 0); assert.equal(c.game.history.length, 0);
  for (let i = 0; i < levels.length; i += 1) {
    solve(levels[i]).forEach((direction) => c.handle(direction));
    assert.equal(c.modal, 'win');
    assert.equal(c.result.steps, levels[i].minSteps);
    assert.equal(c.result.stars, 3);
    if (i < levels.length - 1) { assert.equal(c.progress.allComplete, false); c.handle('next'); }
  }
  assert.equal(c.progress.allComplete, true);
  c.handle('home'); c.handle('start'); assert.equal(c.route, 'home');
  assert.equal(p.messages.at(-1), '地图关卡正在开发中');
  c.handle('levels'); c.handle('level:0'); assert.equal(c.game.state.steps, 0);
  const restored = new GameController(p, levels);
  assert.equal(restored.progress.allComplete, true); assert.equal(restored.progress.state.cards, 0);
});

test('双人在线 PK 创建房间、同步开局并由服务端返回胜负', async () => {
  let now = Date.parse('2026-10-19T08:00:00Z');
  const room = (status, me = {}, players = [{ seat: 1, finished: false }]) => ({
    code: 'ABC234', levelId: 'pk-1', status, winner: 0, players, serverNow: now,
    startAt: now + 5000,
    me: { seat: 1, isHost: true, ready: false, finished: false, ...me },
  });
  const pkRooms = {
    available: true, setSharedRoom() {}, share() {}, promptCode: async () => '', leave: async () => ({}),
    create: async () => ({ room: room('waiting') }),
    ready: async () => ({ room: room('waiting', { ready: true }, [
      { seat: 1, ready: true, finished: false }, { seat: 2, ready: true, finished: false },
    ]) }),
    start: async () => ({ room: room('countdown', { ready: true }, [
      { seat: 1, ready: true, finished: false }, { seat: 2, ready: true, finished: false },
    ]) }),
    get: async () => ({ room: room('playing', { ready: true }, [
      { seat: 1, ready: true, finished: false }, { seat: 2, ready: true, finished: false },
    ]) }),
    finish: async () => ({ room: {
      ...room('finished', { finished: true, result: { steps: 2, elapsedMs: 2400 } }, [
        { seat: 1, finished: true, result: { steps: 2, elapsedMs: 2400 } },
        { seat: 2, finished: true, result: { steps: 3, elapsedMs: 1800 } },
      ]), winner: 1,
    } }),
  };
  const p = { ...platform(), wallNow: () => now, pkRooms };
  const catalog = [
    { id: 'pk-0', campaign: 'classic', rows: ['#####', '#@$.#', '#####'], minSteps: 1 },
    { id: 'pk-1', campaign: 'classic', rows: ['######', '#@ $.#', '######'], minSteps: 2 },
  ];
  const c = new GameController(p, catalog);
  c.handle('campaign:pk');
  assert.equal(c.modal, 'pk-choice');
  c.handle('pk-create');
  await Promise.resolve(); await Promise.resolve();
  assert.equal(c.modal, 'pk-room');
  assert.equal(c.pk.room.code, 'ABC234');
  c.handle('pk-ready-toggle');
  await Promise.resolve(); await Promise.resolve();
  assert.equal(c.pk.room.me.ready, true);
  c.handle('pk-start-match');
  await Promise.resolve(); await Promise.resolve();
  assert.equal(c.modal, 'pk-countdown');
  assert.equal(c.route, 'game');
  now += 5000;
  c.advancePk(5000);
  assert.equal(c.modal, null);
  now += 2400;
  c.handle('right'); c.handle('right');
  await Promise.resolve(); await Promise.resolve();
  assert.equal(c.modal, 'pk-result');
  assert.equal(c.pk.room.winner, 1);
  assert.equal(c.progress.completedLevels, 0);
  c.handle('levels');
  assert.equal(c.pk, null);
  assert.equal(c.route, 'levels');
});

test('双人合作房间串行同步共享棋盘并共同通关', async () => {
  const level = { id: 'coop-1', campaign: 'classic', rows: ['######', '#@ $.#', '######'], minSteps: 2 };
  const players = [{ seat: 1, ready: true }, { seat: 2, ready: true }];
  const makeRoom = (status, moves = []) => ({
    code: 'COOP24', levelId: level.id, mode: 'coop', status, moves, players,
    startAt: Date.now() - 1000, serverNow: Date.now(), completedBy: status === 'finished' ? 1 : 0,
    me: { seat: 1, isHost: true, ready: true },
  });
  const sharedMoves = [];
  const pkRooms = {
    available: true, setSharedRoom() {}, share() {}, leave: async () => ({}),
    create: async () => ({ room: makeRoom('waiting') }),
    move: async (_code, direction) => {
      sharedMoves.push(direction);
      return { room: makeRoom('playing', [...sharedMoves]) };
    },
    complete: async () => ({ room: makeRoom('finished', [...sharedMoves]) }),
  };
  const c = new GameController({ ...platform(), pkRooms }, [level]);
  c.startPk('coop');
  c.enterPkRoom(makeRoom('playing'));
  c.handle('right');
  await Promise.resolve(); await Promise.resolve();
  assert.equal(c.game.state.steps, 1);
  assert.equal(c.modal, null);
  c.handle('right');
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(c.game.complete, true);
  assert.equal(c.modal, 'pk-result');
  assert.deepEqual(c.pk.room.moves, ['right', 'right']);
  assert.equal(c.progress.completedLevels, 0);
});

test('暂停菜单直接提供设置、重新开始和放弃挑战', () => {
  const p = platform();
  const c = new GameController(p, levels);
  assert.equal(c.progress.state.music, true);
  assert.equal(c.progress.state.sound, false);
  assert.equal(c.progress.state.vibration, false);
  c.openLevel(0); c.modal = null;
  c.handle('right');
  c.handle('menu');
  c.handle('music'); c.handle('sound'); c.handle('vibration');
  assert.equal(c.progress.state.music, false);
  assert.equal(c.progress.state.sound, true);
  assert.equal(c.progress.state.vibration, true);
  c.handle('restart'); assert.equal(c.modal, null); assert.equal(c.game.state.steps, 0);
  c.handle('menu'); c.handle('give-up'); assert.equal(c.route, 'levels');
  c.navigate('home'); c.handle('settings'); c.handle('close');
  assert.equal(c.modal, null);
  assert.equal(new GameController(p, levels).progress.state.music, false);
});

test('暂停菜单底部双按钮严格收在设置项宽度内', () => {
  const c = new GameController(platform(), levels);
  c.openLevel(0); c.modal = 'menu';
  const modal = new Modal(c, () => {});
  modal.resize(createViewport({ width: 390, height: 844, safeTop: 91, safeBottom: 34 }));
  const settings = modal.buttons.filter(({ id }) => ['music', 'sound', 'vibration'].includes(id));
  const actions = modal.buttons.filter(({ id }) => ['restart', 'give-up'].includes(id));
  const contentLeft = settings[0].x;
  const contentRight = settings[0].x + settings[0].width;
  assert.equal(Math.min(...actions.map(({ x }) => x)), contentLeft);
  assert.equal(Math.max(...actions.map(({ x, width }) => x + width)), contentRight);
  assert.ok(actions[0].x + actions[0].width < actions[1].x);
});

test('小屏和全面屏上的方向键、棋盘、弹窗均在安全区域内', () => {
  const c = new GameController(platform(), levels); c.openLevel(0);
  for (const info of [{ width: 320, height: 568 }, { width: 390, height: 844, safeTop: 91, safeBottom: 34 }]) {
    const viewport = createViewport(info);
    const page = new GamePage(c, () => {}); page.resize(viewport);
    const bottom = viewport.height - viewport.safeBottom;
    assert.equal(page.boardBounds.x, 30);
    assert.equal(414 - page.boardBounds.x - page.boardBounds.width, 30);
    const undo = page.buttons.find((button) => button.id === 'undo');
    const padCenterY = page.directionPadBounds.y + page.directionPadBounds.height / 2;
    const leftControlsCenterY = (undo.y + page.stepsBounds.y + page.stepsBounds.height) / 2;
    assert.equal(padCenterY, leftControlsCenterY + 2);
    const frame = page.controlsFrameBounds;
    const topGap = page.directionPadBounds.y - frame.y;
    const bottomGap = frame.y + frame.height
      - (page.directionPadBounds.y + page.directionPadBounds.height);
    const rightGap = frame.x + frame.width
      - (page.directionPadBounds.x + page.directionPadBounds.width);
    assert.equal(topGap, rightGap + 2);
    assert.equal(bottomGap, rightGap - 2);
    assert.ok(page.stepsBounds.y < undo.y);
    assert.equal(page.stepsBounds.width, 162);
    assert.equal(page.stepsBounds.height, 52);
    assert.equal(undo.width, 162);
    assert.equal(undo.height, 52);
    assert.ok(undo.x >= frame.x + 4);
    assert.ok(page.stepsBounds.x >= frame.x + 4);
    assert.ok(page.stepsBounds.x + page.stepsBounds.width < page.directionPadBounds.x);
    if (!page.compact) {
      assert.ok(Math.abs(page.boardBounds.y + page.boardBounds.height
        - (page.controlsY - 12)) < 1e-9);
    }
    page.buttons.forEach((button) => {
      if (button.id === 'menu') assert.equal(button.y + button.height / 2, viewport.navigationCenterY);
      else assert.ok(button.y >= viewport.safeTop);
      assert.ok(button.y + button.height < bottom);
    });
    assert.ok(page.boardBounds.y + page.boardBounds.height < undo.y);
    const modal = new Modal(c, () => {});
    for (const kind of ['menu', 'settings', 'win', 'tutorial', 'cards', 'deadlock']) {
      c.modal = kind; modal.resize(viewport);
      const height = kind === 'win' ? 680 : kind === 'menu' || kind === 'settings' ? 450 : 520;
      assert.ok(modal.top + height < bottom);
      modal.buttons.forEach((button) => assert.ok(button.y + button.height < modal.top + height));
    }
  }
});

test('游戏操作区加载生成素材，同时保留四个独立方向触控区', () => {
  const images = [];
  const c = new GameController({ ...platform(), createImage() {
    const image = {};
    images.push(image);
    return image;
  } }, levels);
  c.openLevel(0);
  const page = new GamePage(c, () => {});
  page.resize(createViewport({ width: 390, height: 844, safeTop: 91, safeBottom: 34 }));

  assert.ok(images.some(({ src }) => src === directionPadSource));
  assert.ok(images.some(({ src }) => src === stepsCardSource));
  assert.ok(images.some(({ src }) => src === undoCardSource));
  Object.values(gameAssetFileIDs).forEach(fileID => assert.match(fileID, /^cloud:\/\//));
  assert.deepEqual(page.buttons.filter(({ id }) => ['up', 'down', 'left', 'right'].includes(id))
    .map(({ id }) => id), ['up', 'left', 'right', 'down']);
  assert.equal(page.directionPadBounds.width, page.directionPadBounds.height);
  page.buttons.filter(({ id }) => ['up', 'down', 'left', 'right'].includes(id))
    .forEach((button) => {
      assert.ok(button.hitArea.width * button.hitArea.height > button.width * button.height);
    });
});

test('设置面板加载地图风格音乐、音效和震动图标', () => {
  const images = [];
  const c = new GameController({ ...platform(), createImage() {
    const image = {};
    images.push(image);
    return image;
  } }, levels);
  c.modal = 'settings';
  new Modal(c, () => {});
  Object.values(settingIconSources).forEach((source) => {
    assert.ok(images.some(({ src }) => src === source));
  });
  Object.values(settingIconFileIDs).forEach(fileID => assert.match(fileID, /^cloud:\/\//));
});
