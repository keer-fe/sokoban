import test from 'node:test';
import assert from 'node:assert/strict';
import { levels } from './fixtures/levels.js';
import { areDoorsOpen, GameSession, score } from '../src/game/engine.js';
import { solve } from '../tools/solve-levels.js';
import { GameController } from '../src/game/controller.js';
import { beijingDate, ProgressStore } from '../src/game/progress.js';
import { createViewport } from '../src/core/viewport.js';
import { GamePage } from '../src/pages/game/index.js';
import { Modal } from '../src/ui/modal.js';

function platform() {
  const data = new Map();
  const messages = [];
  return { messages, wallNow: () => Date.parse('2026-10-12T08:00:00Z'),
    notify: (message) => messages.push(message), readStorage: (key) => data.get(key),
    writeStorage: (key, value) => data.set(key, JSON.parse(JSON.stringify(value))) };
}

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

test('签到按北京时间刷新、防重复领取和回拨；存储失败不发卡', () => {
  const p = platform(); const store = new ProgressStore(p, levels);
  const before = Date.parse('2026-10-12T15:59:59Z');
  assert.equal(beijingDate(before), '2026-10-12');
  assert.equal(store.signIn(before), true); assert.equal(store.state.cards, 5);
  assert.equal(store.signIn(before), false);
  assert.equal(store.signIn(before - 86400000), false);
  assert.equal(store.signIn(before + 1000), true); assert.equal(store.state.cards, 10);
  p.writeStorage = () => { throw new Error('full'); };
  assert.equal(store.signIn(before + 86401000), false); assert.equal(store.state.cards, 10);
});

test('导航、弹窗阻断、撤销卡、重开和完整通关流程', () => {
  const p = platform(); const c = new GameController(p, levels);
  c.handle('level:1'); assert.equal(c.route, 'home');
  c.handle('start'); assert.equal(c.modal, 'tutorial');
  c.handle('up'); assert.equal(c.game.state.steps, 0);
  c.handle('skip'); c.handle('undo'); assert.equal(c.modal, null);
  c.handle('up'); c.handle('undo'); assert.equal(c.modal, 'cards');
  c.handle('up'); assert.equal(c.game.state.steps, 1);
  c.handle('signin'); c.handle('claim'); c.handle('claim');
  assert.equal(c.progress.state.cards, 5);
  c.handle('close'); c.handle('undo'); assert.equal(c.game.state.steps, 0);
  assert.equal(c.progress.state.cards, 4);
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
  assert.equal(restored.progress.allComplete, true); assert.equal(restored.progress.state.cards, 4);
});

test('暂停菜单进入设置后返回菜单，首页设置完成后直接关闭', () => {
  const p = platform(); let vibrations = 0; p.vibrate = () => { vibrations += 1; };
  const c = new GameController(p, levels);
  c.openLevel(0); c.modal = null;
  c.handle('menu'); c.handle('settings');
  assert.equal(c.modal, 'settings');
  assert.equal(c.settingsReturn, 'menu');
  const musicBefore = c.progress.state.music;
  c.handle('music'); assert.equal(c.progress.state.music, !musicBefore);
  c.handle('vibration'); assert.equal(c.progress.state.vibration, true);
  assert.equal(vibrations, 1);
  c.handle('close'); assert.equal(c.modal, 'menu');
  c.handle('close'); assert.equal(c.modal, null);
  c.navigate('home'); c.handle('settings'); c.handle('close');
  assert.equal(c.modal, null);
  assert.equal(new GameController(p, levels).progress.state.vibration, true);
});

test('小屏和全面屏上的方向键、棋盘、弹窗均在安全区域内', () => {
  const c = new GameController(platform(), levels); c.openLevel(0);
  for (const info of [{ width: 320, height: 568 }, { width: 390, height: 844, safeTop: 91, safeBottom: 34 }]) {
    const viewport = createViewport(info);
    const page = new GamePage(c, () => {}); page.resize(viewport);
    const bottom = viewport.height - viewport.safeBottom;
    page.buttons.forEach((button) => {
      assert.ok(button.y >= viewport.safeTop);
      assert.ok(button.y + button.height < bottom);
    });
    assert.ok(page.boardBounds.y + page.boardBounds.height < page.buttons.find((b) => b.id === 'undo').y);
    const modal = new Modal(c, () => {});
    for (const kind of ['menu', 'settings', 'win', 'tutorial', 'signin', 'cards', 'deadlock']) {
      c.modal = kind; modal.resize(viewport);
      const height = kind === 'win' ? 680 : kind === 'settings' ? 450 : 520;
      assert.ok(modal.top + height < bottom);
      modal.buttons.forEach((button) => assert.ok(button.y + button.height < modal.top + height));
    }
  }
});
