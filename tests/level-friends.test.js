import test from 'node:test';
import assert from 'node:assert/strict';
import { levelKey, rankLevelFriends, createLevelBoard } from '../open-data/level-board.js';

test('单关好友榜按最佳步数升序、去重并列，隔离不同地图成绩', () => {
  const key = levelKey('selfboot-1');
  const user = (openid, steps, k = key) => ({ openid, nickname: openid, KVDataList: [{ key: k, value: JSON.stringify({ steps }) }] });
  const rows = rankLevelFriends([user('a', 20), user('b', 10), user('c', 10), user('a', 15),
    user('d', -1), user('e', 5, levelKey('selfboot-2'))], key);
  assert.deepEqual(rows.map(row => [row.id, row.steps, row.rank]), [['b', 10, 1], ['c', 10, 1], ['a', 15, 3]]);
  assert.equal(levelKey('../bad'), null);
});

test('上传先读后写，较差成绩不覆盖云端最佳，读取失败不写入', async () => {
  let remote = 12;
  const writes = [];
  const canvas = { getContext: () => ({}) };
  const board = createLevelBoard(async (name, data) => {
    if (name === 'getUserCloudStorage') return { KVDataList: [{ key: data.keyList[0], value: JSON.stringify({ steps: remote }) }] };
    remote = JSON.parse(data.KVDataList[0].value).steps; writes.push(remote);
  }, canvas);
  await Promise.all([board.sync('selfboot-1', 20), board.sync('selfboot-1', 9), board.sync('selfboot-1', 11)]);
  assert.deepEqual(writes, [9]);
  const failed = createLevelBoard(async name => { assert.equal(name, 'getUserCloudStorage'); throw new Error('offline'); }, canvas);
  await assert.rejects(failed.sync('selfboot-1', 5));
});

test('切换关卡时丢弃旧响应，隐藏后不绘制迟到的数据', async () => {
  const labels = [];
  const ctx = { setTransform() {}, clearRect() {}, fillText(value) { labels.push(value); } };
  const waiting = [];
  const board = createLevelBoard((name, data) => {
    assert.equal(name, 'getFriendCloudStorage');
    return new Promise(resolve => waiting.push({ key: data.keyList[0], resolve }));
  }, { width: 300, height: 180, getContext: () => ctx });
  const first = board.show({ levelId: 'selfboot-1' });
  await Promise.resolve();
  const second = board.show({ levelId: 'selfboot-2' });
  await Promise.resolve();
  waiting[1].resolve({ data: [{ openid: 'new', nickname: '新关好友', KVDataList: [{ key: waiting[1].key, value: '{"steps":10}' }] }] });
  await second;
  assert.ok(labels.includes('新关好友'));
  const count = labels.length;
  waiting[0].resolve({ data: [] }); await first;
  assert.equal(labels.length, count);
  const third = board.refresh(); await Promise.resolve();
  board.hide();
  const hiddenCount = labels.length;
  waiting[2].resolve({ data: [] }); await third;
  assert.equal(labels.length, hiddenCount);
});
