import test from 'node:test';
import assert from 'node:assert/strict';
import { GameSession } from '../src/game/engine.js';
import { GameController } from '../src/game/controller.js';
import { ProgressStore } from '../src/game/progress.js';
import { GamePage } from '../src/pages/game/index.js';
import { createViewport } from '../src/core/viewport.js';

const level = { id: 'recording', minSteps: 2, rows: ['#######', '#@ $. #', '#     #', '#######'] };
function setup() {
  let saved = { tutorialDone: true, cards: 3 };
  const messages = [];
  const platform = { readStorage: () => saved, writeStorage: (_, value) => { saved = structuredClone(value); },
    notify: value => messages.push(value) };
  return { platform, messages, c: new GameController(platform, [level]) };
}

test('只录制有效移动，撤销移除对应方向，重开清空录制', () => {
  const game = new GameSession(level);
  game.move('up'); game.move('right'); game.move('down'); game.undo();
  assert.deepEqual(game.moves, ['right']);
  game.move('right');
  assert.equal(game.complete, true);
  assert.deepEqual(game.moves, ['right', 'right']);
  game.restart(); assert.deepEqual(game.moves, []);
});

test('解法持久化，只以更短录制替换；旧存档、地图变化兼容', () => {
  const { platform } = setup();
  const store = new ProgressStore(platform, [level]);
  store.finish(level, 4, 2, ['down', 'right', 'up', 'right']);
  store.finish(level, 2, 3, ['right', 'right']);
  store.finish(level, 4, 2, ['down', 'right', 'up', 'right']);
  assert.deepEqual(new ProgressStore(platform, [level]).state.solutions[level.id].moves, ['right', 'right']);
  assert.deepEqual(new ProgressStore(platform, [{ ...level, rows: ['#####', '#@$.#', '#####'] }]).state.solutions, {});
  assert.deepEqual(new ProgressStore({ readStorage: () => ({ records: {} }) }, [level]).state.solutions, {});
});

test('回放播放、单步、倒退、重播不扣卡不保存，退出恢复本次通关', () => {
  const { c } = setup();
  c.openLevel(0); c.handle('right'); c.handle('right');
  assert.equal(c.modal, 'win');
  const original = c.game;
  const saved = JSON.stringify(c.progress.state);
  c.handle('replay-current');
  assert.equal(c.game.state.steps, 0);
  c.handle('right'); assert.equal(c.game.state.steps, 0);
  c.handle('replay-forward'); assert.equal(c.game.state.steps, 1);
  c.handle('replay-back'); assert.equal(c.game.state.steps, 0);
  c.handle('replay-play'); c.advanceReplay(399); assert.equal(c.game.state.steps, 0);
  c.advanceReplay(1); assert.equal(c.game.state.steps, 1);
  c.advanceReplay(400); assert.equal(c.game.complete, true);
  assert.equal(c.replay.playing, false);
  assert.equal(c.modal, null);
  c.handle('replay-play'); assert.equal(c.game.state.steps, 0);
  c.handle('replay-reset'); assert.equal(c.replay.playing, false);
  assert.equal(JSON.stringify(c.progress.state), saved);
  c.handle('replay-exit'); assert.equal(c.game, original); assert.equal(c.modal, 'win');
});

test('已存解法可在重启后回放并恢复未完成棋盘，损坏记录不进入回放', () => {
  const { c, platform, messages } = setup();
  c.openLevel(0); c.handle('right'); c.handle('right');
  const restored = new GameController(platform, [level]);
  restored.openLevel(0); restored.handle('down');
  const original = restored.game;
  restored.handle('menu'); restored.handle('replay-saved');
  assert.ok(restored.replay);
  restored.handle('replay-exit');
  assert.equal(restored.game, original); assert.equal(restored.game.state.steps, 1);
  assert.equal(restored.modal, 'menu');
  restored.startReplay(['up']);
  assert.equal(restored.replay, null); assert.equal(messages.length, 1);
});

test('保存失败仍能回放本次，回放控制在小屏安全区内', () => {
  const { c, platform } = setup();
  platform.writeStorage = () => { throw new Error('full'); };
  c.openLevel(0); c.handle('right'); c.handle('right');
  assert.equal(c.result.saved, false);
  c.handle('replay-current'); assert.ok(c.replay);
  const page = new GamePage(c, () => {});
  const viewport = createViewport({ width: 320, height: 568 });
  page.resize(viewport);
  for (const button of page.buttons) assert.ok(button.y + button.height < viewport.height - viewport.safeBottom);
  c.handle('replay-exit'); assert.equal(c.result.saved, false);
});
