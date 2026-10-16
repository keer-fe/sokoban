import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldLeaderboard, normalizeWorldRows } from '../src/platform/world-leaderboard.js';
import { GameController } from '../src/game/controller.js';
import { FriendsPage } from '../src/pages/friends/index.js';
import { createViewport } from '../src/core/viewport.js';
import { levels } from './fixtures/levels.js';

test('世界榜云函数提交版本化成绩并清洗返回行', async () => {
  const calls = [];
  const board = createWorldLeaderboard({ callFunction(options) {
    calls.push({ name: options.name, data: options.data });
    if (options.name === 'submitLeaderboard') options.success({ result: { ok: true } });
    else options.success({ result: { rows: [
      { rank: 1, completed: 8, totalStars: 21, nickname: ' 玩家甲 ', isMe: true },
      { completed: 5, totalStars: 12, nickname: '' },
      { completed: -1, totalStars: 0, nickname: '坏数据' },
    ] } });
  } });
  assert.equal(board.available, true);
  await board.submit({ completed: 8, totalStars: 21 });
  const rows = await board.load(50);
  assert.deepEqual(calls, [
    { name: 'submitLeaderboard', data: { completed: 8, totalStars: 21, scoreVersion: 1 } },
    { name: 'getWorldLeaderboard', data: { limit: 50, scoreVersion: 1 } },
  ]);
  assert.deepEqual(rows, [
    { rank: 1, completed: 8, totalStars: 21, nickname: '玩家甲', isMe: true },
    { rank: 2, completed: 5, totalStars: 12, nickname: '玩家2', isMe: false },
  ]);
  assert.deepEqual(normalizeWorldRows(null), []);
});

test('控制器加载、刷新世界榜并在通关统计中提交总星数', async () => {
  let loads = 0;
  const submissions = [];
  const platform = {
    readStorage: () => null,
    writeStorage: () => {},
    worldLeaderboard: {
      available: true,
      submit: async score => { submissions.push(score); return { ok: true }; },
      load: async () => { loads++; return [{ rank: 1, completed: 3, totalStars: 8,
        nickname: '玩家ABCD', isMe: true }]; },
    },
  };
  const controller = new GameController(platform, levels);
  controller.modal = 'friends';
  controller.handle('friends:tab-world');
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(controller.worldBoard.state, 'ready');
  assert.equal(loads, 1);
  controller.handle('friends:refresh');
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(loads, 2);
  await controller.syncWorldLeaderboard();
  assert.deepEqual(submissions.at(-1), { completed: 0, totalStars: 0 });
});

test('世界榜绘制真实排名、本人标记和成绩', () => {
  const labels = [];
  const ctx = new Proxy({
    fillText(value) { labels.push(String(value)); },
    measureText: value => ({ width: String(value).length * 8 }),
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  const controller = new GameController({ readStorage: () => null }, levels);
  controller.friendsTab = 'world';
  controller.worldBoard = { state: 'ready', error: null, rows: [
    { rank: 1, completed: 12, totalStars: 31, nickname: '玩家ABCD', isMe: true },
  ] };
  const page = new FriendsPage(controller, () => {});
  page.resize(createViewport({ width: 390, height: 844, safeTop: 91, safeBottom: 34 }));
  page.render(ctx);
  assert.ok(labels.includes('🥇'));
  assert.ok(labels.includes('（我）玩家ABCD'));
  assert.ok(labels.includes('31 星'));
  assert.ok(labels.includes('12 关'));
});
