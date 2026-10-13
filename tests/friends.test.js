import test from 'node:test';
import assert from 'node:assert/strict';
import { PROGRESS_KEY, readProgress, rankFriends, ProgressSync } from '../open-data/model.js';
import { createOpenDataBoard } from '../open-data/context.js';
import { GameController } from '../src/game/controller.js';
import { FriendsPage } from '../src/pages/friends/index.js';
import { createViewport } from '../src/core/viewport.js';
import { createFriendBoard } from '../src/platform/friend-board.js';
import { levels } from './fixtures/levels.js';
import { solve } from '../tools/solve-levels.js';
import { apiError, explainError, needsPrivacyDeclaration } from '../open-data/errors.js';

test('保留微信 API 错误码和原因，不把权限或未知错误误报为网络问题', () => {
  const denied = apiError('getFriendCloudStorage', { errMsg: 'auth deny', errCode: 100 });
  assert.equal(denied.api, 'getFriendCloudStorage');
  assert.equal(denied.code, 100);
  assert.match(explainError(denied).hint, /权限/);
  assert.match(explainError(denied).detail, /100.*auth deny/);
  assert.match(explainError(apiError('getFriendCloudStorage', new Error('API unavailable'))).hint, /手机预览/);
  assert.match(explainError(new Error('timed out')).hint, /网络/);
  assert.doesNotMatch(explainError(new Error('system error')).hint, /网络/);
  const privacy = new Error('getFriendCloudStorage:fail please go to mp to announce your privacy usage');
  assert.equal(needsPrivacyDeclaration(privacy), true);
  assert.match(explainError(privacy).hint, /公众平台/);
});

const record = completed => [{ key: PROGRESS_KEY, value: JSON.stringify({ completed }) }];
const friend = (id, completed) => ({ openid: id, nickname: id, KVDataList: record(completed) });

test('共享画布在主域按 DPR 设置尺寸，先设置再通知子域，重复布局不清空画布', () => {
  let width = 0, height = 0, changes = 0;
  const canvas = {
    get width() { return width; }, set width(value) { width = value; changes++; },
    get height() { return height; }, set height(value) { height = value; changes++; },
  };
  const bridge = createFriendBoard({ getOpenDataContext: () => ({ canvas, postMessage(message) {
    assert.equal(message.type, 'resize');
    assert.equal(canvas.width, 1098);
    assert.equal(canvas.height, 1560);
  } }) });
  bridge.send('resize', { width: 366, height: 520, pixelRatio: 3 });
  bridge.send('resize', { width: 366, height: 520, pixelRatio: 3 });
  assert.equal(changes, 2);
});

test('好友进度校验、去重、降序和跨页并列名次', () => {
  for (const value of [-1, 101, 1.5, '8', null]) assert.equal(readProgress(record(value)), null);
  assert.equal(readProgress([{ key: PROGRESS_KEY, value: 'bad json' }]), null);
  const rows = rankFriends([friend('a', 9), friend('b', 12), friend('c', 9), friend('a', 7), friend('d', -1), friend('e', 0)]);
  assert.deepEqual(rows.map(row => [row.id, row.completed, row.rank]), [['b', 12, 1], ['a', 9, 2], ['c', 9, 2], ['e', 0, 4]]);
  const many = rankFriends(Array.from({ length: 8 }, (_, i) => friend(String(i), i < 7 ? 10 : 3)));
  assert.equal(many[6].rank, 1);
  assert.equal(many[7].rank, 8);
});

test('先读后写，不用低进度覆盖云端；读失败不写，失败可重试', async () => {
  let cloud = record(12), writes = 0, readFails = false, writeFails = false;
  const sync = new ProgressSync(async (method, options) => {
    if (method === 'getUserCloudStorage') {
      if (readFails) throw new Error('offline');
      return { KVDataList: cloud };
    }
    writes++;
    if (writeFails) throw new Error('offline');
    cloud = options.KVDataList;
    return {};
  });
  await sync.sync(2);
  assert.equal(writes, 0); assert.equal(sync.confirmed, 12);
  readFails = true;
  await assert.rejects(sync.sync(13));
  assert.equal(writes, 0);
  readFails = false; writeFails = true;
  await assert.rejects(sync.sync(13));
  assert.equal(sync.confirmed, 12);
  writeFails = false;
  await sync.sync(2);
  assert.equal(readProgress(cloud), 13);
});

test('连续通关时串行写入最高目标，新账号也可登记零关', async () => {
  let cloud = [], release;
  let first = true;
  const writes = [];
  const sync = new ProgressSync(async (method, options) => {
    if (method === 'getUserCloudStorage') return { KVDataList: cloud };
    if (first) { first = false; await new Promise(resolve => { release = resolve; }); }
    cloud = options.KVDataList;
    writes.push(readProgress(cloud));
    return {};
  });
  const firstRequest = sync.sync(0);
  await Promise.resolve();
  const secondRequest = sync.sync(3);
  assert.equal(firstRequest, secondRequest);
  release();
  await firstRequest;
  assert.deepEqual(writes, [0, 3]);
});

test('成功保存后同步已通关数量，重排后的非连续成绩也计入数量', () => {
  const messages = [];
  const c = new GameController({ readStorage: () => null, writeStorage: () => {},
    friendBoard: { send: (type, data) => messages.push({ type, ...data }) } }, levels);
  c.openLevel(0); c.handle('skip');
  solve(levels[0]).forEach(move => c.handle(move));
  assert.equal(c.modal, 'win');
  assert.deepEqual(messages.at(-1), { type: 'sync', completed: 1 });
  c.handle('home'); c.handle('friends');
  assert.equal(c.route, 'friends');
  c.handle('friends:next');
  assert.equal(messages.at(-1).type, 'next');
  c.progress.state.records[levels[4].id] = { stars: 3, bestSteps: 10 };
  assert.equal(c.progress.completedLevels, 2);
});

test('平台缺少开放数据域或消息失败时回退，好友页适配安全区', () => {
  assert.equal(createFriendBoard({}).available, false);
  const bridge = createFriendBoard({ getOpenDataContext: () => ({ postMessage: () => { throw new Error('unsupported'); } }) });
  bridge.send('sync', { completed: 1 });
  assert.equal(bridge.available, false);
  const c = new GameController({ readStorage: () => null }, levels);
  for (const info of [{ width: 320, height: 568 }, { width: 390, height: 844, safeTop: 91, safeBottom: 34 }]) {
    const page = new FriendsPage(c, () => {});
    const viewport = createViewport(info);
    page.resize(viewport);
    page.buttons.forEach(button => assert.ok(button.y + button.height < viewport.height - viewport.safeBottom));
    assert.ok(page.bounds.height >= 430);
  }
});

test('开放数据域绘制加载、空榜、错误、分页和并列；隐藏后不再绘制', async () => {
  const labels = [];
  const ctx = new Proxy({ fillText: value => labels.push(value), measureText: value => ({ width: value.length * 8 }) },
    { get: (target, key) => key in target ? target[key] : () => {} });
  const canvas = { getContext: () => ctx,
    get width() { return 1098; }, set width(_) { throw new Error('subdomain cannot resize'); },
    get height() { return 1560; }, set height(_) { throw new Error('subdomain cannot resize'); } };
  let data = Array.from({ length: 8 }, (_, i) => friend(`friend-${i}`, 10));
  let fail = false;
  const board = createOpenDataBoard({ getSharedCanvas: () => canvas,
    getUserCloudStorage: options => options.success({ KVDataList: record(1) }),
    setUserCloudStorage: options => options.success({}),
    getFriendCloudStorage: options => fail ? options.fail({}) : options.success({ data }),
  });
  const send = (type, extra = {}) => board.onMessage({ channel: 'sokoban.friends.v1', type, ...extra });
  await send('resize', { width: 366, height: 520, pixelRatio: 3 });
  assert.equal(canvas.width, 1098);
  await send('show', { completed: 1 });
  assert.ok(labels.includes('正在获取好友进度…'));
  assert.ok(labels.includes('1 / 2 页 · 同进度并列'));
  await send('next');
  assert.ok(labels.includes('2 / 2 页 · 同进度并列'));
  data = []; await send('refresh');
  assert.ok(labels.includes('还没有好友进度'));
  fail = true; await send('refresh');
  assert.ok(labels.includes('好友榜暂时加载失败'));
  await send('hide'); const count = labels.length;
  await send('resize');
  assert.equal(labels.length, count);
  await send('pause');
});

test('同步失败自动重试，后台取消重试，恢复后补传', async () => {
  const scheduled = new Map();
  let nextId = 0, offline = true, writes = 0;
  const timers = {
    setTimeout(callback, delay) { scheduled.set(++nextId, { callback, delay }); return nextId; },
    clearTimeout(id) { scheduled.delete(id); },
  };
  const board = createOpenDataBoard({
    getSharedCanvas: () => ({ getContext: () => ({}) }),
    getUserCloudStorage: options => offline ? options.fail({}) : options.success({ KVDataList: [] }),
    setUserCloudStorage: options => { writes++; options.success({}); },
  }, timers);
  const send = (type, completed = 3) => board.onMessage({ channel: 'sokoban.friends.v1', type, completed });
  await send('sync');
  assert.deepEqual([...scheduled.values()].map(item => item.delay), [2000]);
  const [id, retry] = [...scheduled.entries()][0];
  scheduled.delete(id);
  retry.callback();
  // Flush the async read failure and its retry scheduling without real-time sleeps.
  for (let i = 0; i < 10; i++) await Promise.resolve();
  assert.deepEqual([...scheduled.values()].map(item => item.delay), [10000]);
  await send('pause');
  assert.equal(scheduled.size, 0);
  offline = false;
  await send('sync', 1);
  assert.equal(writes, 1);
  assert.equal(scheduled.size, 0);
});
