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
      { rank: 1, completed: 8, totalStars: 21, nickname: ' 玩家甲 ', avatarUrl: ' https://a.test/1.png ', isMe: true },
      { completed: 5, totalStars: 12, nickname: '' },
      { completed: -1, totalStars: 0, nickname: '坏数据' },
    ] } });
  } });
  assert.equal(board.available, true);
  await board.submit({ completed: 8, totalStars: 21, nickname: '玩家甲', avatarUrl: 'https://a.test/1.png' });
  const rows = await board.load(50);
  assert.deepEqual(calls, [
    { name: 'submitLeaderboard', data: { completed: 8, nickname: '玩家甲', avatarUrl: 'https://a.test/1.png', scoreVersion: 2 } },
    { name: 'getWorldLeaderboard', data: { limit: 50, scoreVersion: 2 } },
  ]);
  assert.deepEqual(rows, [
    { rank: 1, completed: 8, nickname: '玩家甲', avatarUrl: 'https://a.test/1.png', isMe: true },
    { rank: 2, completed: 5, nickname: '玩家2', avatarUrl: '', isMe: false },
  ]);
  assert.deepEqual(normalizeWorldRows(null), []);
});

test('控制器加载、刷新世界榜并提交经典模式通关数', async () => {
  let loads = 0;
  const submissions = [];
  const platform = {
    readStorage: () => null,
    writeStorage: () => {},
    readPlayerProfile: () => ({ nickname: '测试玩家', avatarUrl: 'https://a.test/me.png' }),
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
  assert.deepEqual(submissions.at(-1), { completed: 0,
    nickname: '测试玩家', avatarUrl: 'https://a.test/me.png' });
});

test('经典模式榜单不计入其他模式已通关关卡', async () => {
  const submissions = [];
  const mixedLevels = [...levels, { ...levels[0], id: 'adventure-test', campaign: 'adventure' }];
  const controller = new GameController({ readStorage: () => null,
    worldLeaderboard: { available: true, submit: async score => { submissions.push(score); } },
    friendBoard: { send() {} } }, mixedLevels);
  const classic = levels.find(level => (level.campaign || 'classic') === 'classic');
  const other = mixedLevels.at(-1);
  controller.progress.state.records[classic.id] = { stars: 1 };
  controller.progress.state.records[other.id] = { stars: 3 };
  assert.equal(controller.progress.completedLevels, 2);
  assert.equal(controller.progress.classicCompletedLevels, 1);
  await controller.syncWorldLeaderboard();
  assert.equal(submissions.at(-1).completed, 1);
});

test('首次启动先统一获取玩家资料，世界榜入口不再重复授权', async () => {
  let requests = 0;
  let submissions = 0;
  let profile = null;
  const platform = {
    readStorage: () => null,
    writeStorage: () => {},
    readPlayerProfile: () => profile,
    canRequestPlayerProfile: true,
    requestPlayerProfile: async () => {
      requests++;
      profile = { nickname: '启动玩家', avatarUrl: 'https://a.test/start.png' };
      return profile;
    },
    friendBoard: { send() {} },
    worldLeaderboard: {
      available: true,
      submit: async () => { submissions++; return { ok: true }; },
      load: async () => [],
    },
  };
  const controller = new GameController(platform, levels);
  assert.equal(controller.modal, 'profile');
  controller.handle('authorize-profile');
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(controller.modal, null);
  assert.equal(requests, 1);
  assert.equal(submissions, 1);

  controller.modal = 'friends';
  controller.handle('friends:tab-world');
  await Promise.resolve();
  assert.equal(requests, 1);
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
  assert.ok(labels.includes('1'));
  assert.ok(labels.includes('我'));
  assert.ok(labels.includes('12'));
});
