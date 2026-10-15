import test from 'node:test';
import assert from 'node:assert/strict';
import { PROGRESS_KEY, readProgress, rankFriends, ProgressSync } from '../open-data/model.js';
import { createOpenDataBoard } from '../open-data/context.js';
import { FRIENDS_PUSH_SOURCES } from '../open-data/push-animation.js';
import { GameController } from '../src/game/controller.js';
import { FriendsPage, friendsAssetFileIDs, friendsAssetSources, refreshIconSource } from '../src/pages/friends/index.js';
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
  assert.equal(c.route, 'home');
  assert.equal(c.modal, 'friends');
  c.handle('friends:tab-world');
  assert.equal(c.friendsTab, 'world');
  c.handle('friends:tab-friends');
  assert.equal(c.friendsTab, 'friends');
  c.handle('friends:refresh');
  assert.equal(messages.at(-1).type, 'refresh');
  c.handle('close');
  assert.equal(c.modal, null);
  assert.equal(c.route, 'home');
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
    assert.deepEqual(page.buttons.map(button => button.id),
      ['close', 'friends:tab-friends', 'friends:tab-world', 'friends:refresh']);
    assert.ok(page.bounds.y > page.frame.y);
    assert.ok(page.bounds.y + page.bounds.height < page.frame.y + page.frame.height);
    page.buttons.forEach(button => {
      assert.ok(button.x >= page.frame.x && button.x + button.width <= page.frame.x + page.frame.width);
      assert.ok(button.y >= page.frame.y && button.y + button.height <= page.frame.y + page.frame.height);
    });
  }
});

test('好友榜拖动和滚轮按像素连续滚动，不再发送翻页动作', () => {
  const messages = [];
  const controller = new GameController({ readStorage: () => null,
    friendBoard: { send: (type, data) => messages.push({ type, ...data }) } }, levels);
  const page = new FriendsPage(controller, () => {});
  page.resize(createViewport({ width: 390, height: 844, safeTop: 91, safeBottom: 34 }));
  const center = { id: 1, x: page.bounds.x + page.bounds.width / 2,
    y: page.bounds.y + page.bounds.height / 2 };
  page.handlePointer('start', center);
  page.handlePointer('move', { ...center, y: center.y - 18 });
  page.handlePointer('move', { ...center, y: center.y - 32 });
  page.handlePointer('end', { ...center, y: center.y - 32 });
  assert.deepEqual(messages.slice(1), [{ type: 'scroll', delta: 18 }, { type: 'scroll', delta: 14 }]);
  page.handleWheel(80, center);
  assert.deepEqual(messages.at(-1), { type: 'scroll', delta: 80 });
  page.handleWheel(-80, { x: 0, y: 0 });
  assert.deepEqual(messages.at(-1), { type: 'scroll', delta: 80 });
  controller.friendsTab = 'world';
  page.handleWheel(80, center);
  assert.deepEqual(messages.at(-1), { type: 'scroll', delta: 80 });
});

test('世界榜显示开发中，并将关闭按钮放在弹窗右上角', () => {
  const labels = [];
  const titleLetters = [];
  const footerLetters = [];
  const ctx = new Proxy({ fillText(value, x, y) {
    labels.push(value);
    if (['排', '行', '榜'].includes(value)) titleLetters.push({ value, y });
    if (value === '更') footerLetters.push({ value, y });
  },
    measureText: value => ({ width: String(value).length * 8 }) },
    { get: (target, key) => key in target ? target[key] : () => {} });
  const controller = new GameController({ readStorage: () => null }, levels);
  controller.friendsTab = 'world';
  const page = new FriendsPage(controller, () => {});
  page.resize(createViewport({ width: 390, height: 844, safeTop: 91, safeBottom: 34 }));
  page.render(ctx);
  assert.ok(labels.includes('正在开发中'));
  assert.deepEqual(titleLetters.map(({ y }) => y), [page.frame.y + 65, page.frame.y + 65, page.frame.y + 65]);
  assert.deepEqual(footerLetters.map(({ y }) => y), [page.frame.y + page.frame.height - 69]);
  assert.equal(page.buttons.some(button => button.id === 'friends:refresh'), false);
  const close = page.buttons.find(button => button.id === 'close');
  assert.ok(close.x > page.frame.x + page.frame.width / 2);
  assert.ok(close.y < page.bounds.y);
});

test('好友榜与世界榜使用独立按钮，不再绘制连接区', () => {
  const fills = [];
  const ctx = new Proxy({ fillRect: (...args) => fills.push(args),
    measureText: value => ({ width: String(value).length * 8 }) },
    { get: (target, key) => key in target ? target[key] : () => {} });
  const controller = new GameController({ readStorage: () => null }, levels);
  const page = new FriendsPage(controller, () => {});
  const viewport = createViewport({ width: 390, height: 844, safeTop: 91, safeBottom: 34 });
  const seam = button => [button.x + 3, button.y + button.height - 4, button.width - 6, 10];
  const hasSeam = button => fills.some(fill => JSON.stringify(fill) === JSON.stringify(seam(button)));
  page.resize(viewport);
  page.render(ctx);
  const friend = page.buttons.find(button => button.id === 'friends:tab-friends');
  const world = page.buttons.find(button => button.id === 'friends:tab-world');
  const refresh = page.buttons.find(button => button.id === 'friends:refresh');
  assert.equal(friend.y, page.frame.y + 138);
  assert.equal(world.y, page.frame.y + 138);
  assert.equal(refresh.y, page.frame.y + 132);
  assert.equal(hasSeam(friend), false);
  assert.equal(hasSeam(world), false);
  controller.friendsTab = 'world';
  page.resize(viewport);
  fills.length = 0;
  page.render(ctx);
  assert.equal(hasSeam(world), false);
  assert.equal(hasSeam(friend), false);
});

test('好友榜刷新按钮使用本地图标，加载失败时保留文字回退', () => {
  const images = [];
  const drawn = [];
  const ctx = new Proxy({ drawImage: (...args) => drawn.push(args),
    measureText: value => ({ width: String(value).length * 8 }) },
    { get: (target, key) => key in target ? target[key] : () => {} });
  const controller = new GameController({ readStorage: () => null,
    createImage: () => { const image = {}; images.push(image); return image; } }, levels);
  const page = new FriendsPage(controller, () => {});
  assert.deepEqual(images.map(image => image.src), Object.values(friendsAssetSources));
  assert.equal(refreshIconSource,
    'https://636c-cloud1-d5gqpaioo2d8acf27-1443887035.tcb.qcloud.la/images/ui/friends-refresh-v2.png');
  const refreshImage = images[1];
  page.resize(createViewport({ width: 390, height: 844, safeTop: 91, safeBottom: 34 }));
  page.render(ctx);
  assert.equal(page.buttons.find(button => button.id === 'friends:refresh').label, '刷新');
  refreshImage.onload();
  page.render(ctx);
  assert.equal(page.buttons.find(button => button.id === 'friends:refresh').label, '');
  assert.ok(drawn.some(([source]) => source === refreshImage));
  refreshImage.onerror();
  page.render(ctx);
  assert.equal(page.buttons.find(button => button.id === 'friends:refresh').label, '刷新');
});

test('排行榜 UI 在微信中通过云文件 ID 获取签名地址', async () => {
  const images = [];
  let requested;
  const controller = new GameController({
    readStorage: () => null,
    createImage() { const image = {}; images.push(image); return image; },
    resolveCloudFiles(fileIDs) {
      requested = fileIDs;
      return Promise.resolve(Object.fromEntries(Object.keys(fileIDs)
        .map(name => [name, `https://signed.example/${name}.png`])));
    },
  }, levels);
  new FriendsPage(controller, () => {});
  await Promise.resolve();
  assert.deepEqual(requested, friendsAssetFileIDs);
  assert.deepEqual(images.map(image => image.src), [
    'https://signed.example/panel.png',
    'https://signed.example/refresh.png',
    'https://signed.example/close.png',
  ]);
  assert.equal(friendsAssetFileIDs.close,
    'cloud://cloud1-d5gqpaioo2d8acf27.636c-cloud1-d5gqpaioo2d8acf27-1443887035/images/ui/friends-close-v2.png');
});

test('开放数据域加载并绘制冠亚季军本地图标', async () => {
  const images = [];
  const drawn = [];
  const ctx = new Proxy({ drawImage: image => drawn.push(image),
    measureText: value => ({ width: String(value).length * 8 }) },
    { get: (target, key) => key in target ? target[key] : () => {} });
  const board = createOpenDataBoard({
    getSharedCanvas: () => ({ getContext: () => ctx }),
    createImage() { const image = {}; images.push(image); return image; },
    getUserCloudStorage: options => options.success({ KVDataList: record(0) }),
    getFriendCloudStorage: options => options.success({ data: [friend('gold', 3),
      friend('silver', 2), friend('bronze', 1)] }),
  });
  assert.deepEqual(images.map(image => image.src), [
    'open-data/assets/medal-gold.png',
    'open-data/assets/medal-silver.png',
    'open-data/assets/medal-bronze.png',
    FRIENDS_PUSH_SOURCES.character,
    FRIENDS_PUSH_SOURCES.crate,
  ]);
  await board.onMessage({ channel: 'sokoban.friends.v1', type: 'show', completed: 0 });
  images.slice(0, 3).forEach(image => image.onload());
  assert.deepEqual([...new Set(drawn)], images.slice(0, 3));
});

test('好友榜加载时复用首屏小人推箱子的逐帧动画', async () => {
  const images = [];
  const drawn = [];
  let finishFriends;
  const ctx = new Proxy({
    ellipse: undefined,
    drawImage: (...args) => drawn.push(args),
    measureText: value => ({ width: String(value).length * 8 }),
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  const board = createOpenDataBoard({
    getSharedCanvas: () => ({ getContext: () => ctx }),
    createImage() { const image = {}; images.push(image); return image; },
    getUserCloudStorage: options => options.success({ KVDataList: record(1) }),
    getFriendCloudStorage: options => { finishFriends = options.success; },
  });
  const showing = board.onMessage({ channel: 'sokoban.friends.v1', type: 'show', completed: 1 });
  for (let index = 0; index < 8 && !finishFriends; index += 1) await Promise.resolve();
  const character = images.find(image => image.src === FRIENDS_PUSH_SOURCES.character);
  const crate = images.find(image => image.src === FRIENDS_PUSH_SOURCES.crate);
  assert.ok(character && crate);
  character.onload(); crate.onload();
  assert.ok(drawn.some(args => args[0] === character));
  assert.ok(drawn.some(args => args[0] === crate));
  finishFriends({ data: [friend('self', 1)] });
  await showing;
});

test('好友榜行绘制加粗且由圆角裁切的名次色条，标记本人并让战绩文字底部对齐', async () => {
  const fills = [];
  const labels = [];
  let clips = 0;
  const target = { textBaseline: 'alphabetic', fillStyle: '#000',
    fillRect(...args) { fills.push(args); },
    clip() { clips++; },
    fillText(value, x, y) {
      labels.push({ value: String(value), x, y,
        baseline: target.textBaseline, color: target.fillStyle });
    },
    measureText: value => ({ width: String(value).length * 8 }),
  };
  const ctx = new Proxy(target, { get: (value, key) => key in value ? value[key] : () => {} });
  const board = createOpenDataBoard({
    getSharedCanvas: () => ({ getContext: () => ctx }),
    getUserCloudStorage: options => options.success({ KVDataList: record(23) }),
    getUserInfo: options => options.success({ data: [{ openId: 'self', nickName: '玩家', avatarUrl: '' }] }),
    getFriendCloudStorage: options => options.success({ data: [
      { ...friend('self', 23), nickname: '玩家', avatarUrl: '' },
      friend('other', 12),
    ] }),
  });
  await board.onMessage({ channel: 'sokoban.friends.v1', type: 'show', completed: 23 });
  assert.ok(fills.some(args => JSON.stringify(args) === JSON.stringify([7, 51, 6, 63])));
  assert.ok(clips >= 2);
  assert.ok(labels.some(item => item.value === '（我）玩家'));
  const completed = labels.findLast(item => item.value === '23');
  const result = ['已通关', '23', '关'].map(value => labels.findLast(
    item => item.value === value && item.y === completed.y));
  assert.ok(result.every(Boolean));
  assert.deepEqual(result.map(item => item.baseline), ['alphabetic', 'alphabetic', 'alphabetic']);
  assert.equal(new Set(result.map(item => item.y)).size, 1);
  assert.equal(result[0].color, result[2].color);
  assert.notEqual(result[1].color, result[2].color);
});

test('开放数据域绘制加载、空榜、错误及连续滚动；隐藏后不再绘制', async () => {
  const frames = [];
  const ctx = new Proxy({ clearRect: () => frames.push([]), fillText: value => frames.at(-1).push(value),
    measureText: value => ({ width: value.length * 8 }) },
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
  assert.ok(frames.some(frame => frame.includes('正在获取好友进度…')));
  assert.ok(frames.at(-1).includes('friend-0'));
  await send('scroll', { delta: 90 });
  assert.ok(frames.at(-1).includes('friend-7'));
  assert.equal(frames.at(-1).includes('friend-0'), false);
  await send('scroll', { delta: -90 });
  assert.ok(frames.at(-1).includes('friend-0'));
  assert.equal(frames.at(-1).some(value => String(value).includes('页')), false);
  data = []; await send('refresh');
  assert.ok(frames.at(-1).includes('还没有好友进度'));
  fail = true; await send('refresh');
  assert.ok(frames.at(-1).includes('好友榜暂时加载失败'));
  await send('hide'); const count = frames.length;
  await send('resize');
  assert.equal(frames.length, count);
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
