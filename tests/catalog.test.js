import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { campaigns, levels } from '../src/game/levels.js';
import { GameSession, parseLevel } from '../src/game/engine.js';
import { GameController } from '../src/game/controller.js';
import { solve as bfsSolve } from '../tools/solve-levels.js';
import { LevelsPage } from '../src/pages/levels/index.js';
import { createViewport } from '../src/core/viewport.js';

test('经典模式首关教学，后接 99 张原始地图，稳定 ID 和连续编号', () => {
  const source = JSON.parse(readFileSync(new URL('../docs/levels-original.json', import.meta.url))).levels;
  const tiles = ['_', '#', ' ', '.', '$', '*', '@', '+'];
  const classic = levels.filter(level => level.campaign === 'classic');
  const adventure = levels.filter(level => level.campaign === 'adventure');
  assert.equal(classic.length, 100);
  assert.equal(adventure.length, 12);
  assert.deepEqual(campaigns.map(campaign => campaign.id), ['classic', 'adventure', 'coop']);
  assert.ok(classic.every((level, index) => level.campaignIndex === index));
  assert.deepEqual(classic.slice(1).map(level => level.sourceNumber), Array.from({ length: 99 }, (_, i) => i + 1));
  assert.equal(classic[0].id, 'classic-learn-1');
  assert.equal(classic[0].name, '经典模式 · 第 1 关');
  assert.equal(classic[0].boxCount, 1);
  assert.equal(classic[0].minSteps, 4);
  assert.equal(classic[1].id, 'selfboot-1');
  assert.equal(classic[1].name, '经典模式 · 第 2 关');
  assert.ok(levels.every(level => !level.id.startsWith('onboarding-')));
  assert.equal(new Set(levels.map(level => level.id)).size, levels.length);
  classic.filter(level => level.sourceNumber).forEach(level => {
    const index = level.sourceNumber - 1;
    assert.equal(level.id, `selfboot-${level.sourceNumber}`);
    assert.deepEqual(level.rows, source[index].map(row => row.map(cell => tiles[cell]).join('')));
    const board = parseLevel(level);
    source[index].flat().forEach((cell, pos) => {
      assert.equal(board.floors.has(pos), cell >= 2);
      assert.equal(board.goals.has(pos), [3, 5, 7].includes(cell));
      assert.equal(board.boxes.includes(pos), [4, 5].includes(cell));
    });
  });
  const game = new GameSession({ id: 'void', rows: ['#####', '#@_$#', '# . #', '#####'] });
  assert.equal(game.move('right'), false);
});

test('经典与冒险使用独立目录、编号和顺序解锁', () => {
  const catalog = [
    { id: 'classic-1', campaign: 'classic', rows: ['#####', '#@$.#', '#####'] },
    { id: 'classic-2', campaign: 'classic', rows: ['#####', '#@$.#', '#####'] },
    { id: 'adventure-1', campaign: 'adventure', rows: ['#####', '#@$.#', '#####'] },
    { id: 'adventure-2', campaign: 'adventure', rows: ['#####', '#@$.#', '#####'] },
  ];
  let saved = { records: Object.fromEntries(Array.from({ length: 6 }, (_, i) =>
    [`onboarding-${i + 1}`, { bestSteps: 1, stars: 3 }])) };
  const c = new GameController({ readStorage: () => saved, writeStorage: (_, value) => { saved = value; } }, catalog);
  assert.deepEqual(c.campaignEntries('classic').map(entry => entry.index), [0, 1]);
  assert.deepEqual(c.campaignEntries('adventure').map(entry => entry.index), [2, 3]);
  c.levelCampaign = 'adventure';
  assert.equal(c.campaignLevelNumber(2), 1);
  assert.equal(c.campaignLevelNumber(3), 2);
  assert.equal(c.progress.isUnlocked(2), true);
  assert.equal(c.progress.isUnlocked(3), false);
  c.progress.finish(catalog[2], 1, 3, ['right']);
  assert.equal(c.progress.isUnlocked(3), true);
  assert.equal(c.nextLevelIndex(2), 3);
  assert.equal(c.nextLevelIndex(3), null);
  assert.equal(c.resumeLevelIndex('classic'), 0);
  assert.equal(c.resumeLevelIndex('adventure'), 3);
});

test('已标定的最少步数可求解并逐步通关', () => {
  // Skip long paths where BFS cannot complete inside a unit-test budget; those are verified offline via tools/solve-advanced-v2.js.
  levels.filter(level => level.minSteps && level.minSteps <= 120).forEach(level => {
    const path = bfsSolve(level, { maxStates: 2_000_000, maxMs: 20_000 });
    assert.equal(path.length, level.minSteps);
    const game = new GameSession(level);
    path.forEach(direction => {
      assert.equal(game.move(direction), true);
      assert.equal(game.deadlock, null, `${level.id}: solution must not trigger deadlock`);
    });
    assert.equal(game.complete, true);
  });
});

test('棋盘画廊可滚动，模式切换保留独立滚动位置', () => {
  const c = new GameController({ readStorage: () => null });
  const actions = [];
  const page = new LevelsPage(c, action => actions.push(action));
  page.resize(createViewport({ width: 320, height: 568 }));
  assert.ok(page.buttons.some(button => button.id === 'campaign:classic'));
  assert.ok(page.buttons.some(button => button.id === 'campaign:adventure'));
  assert.ok(page.buttons.some(button => button.id === 'campaign:coop'));
  assert.ok(page.buttons.some(button => button.id === 'campaign:pk'));
  c.handle('campaign:classic');
  page.resize(createViewport({ width: 320, height: 568 }));
  const classicEntries = c.campaignEntries('classic');
  assert.deepEqual(page.entries.map(entry => entry.index), classicEntries.map(entry => entry.index));
  assert.ok(page.buttons.every(button => button.id !== 'previous' && button.id !== 'following'));
  const firstVisible = page.buttons.filter(button => button.id.startsWith('level:')).map(button => button.id);
  page.scrollBy(100000);
  assert.equal(page.scrollOffsets.classic, page.maxScroll);
  assert.notDeepEqual(page.buttons.filter(button => button.id.startsWith('level:')).map(button => button.id), firstVisible);
  const dragStart = { x: 60, y: page.listBounds.y + 70, id: 1 };
  page.handlePointer('start', dragStart);
  page.handlePointer('move', { ...dragStart, y: dragStart.y - 40 });
  page.handlePointer('end', { ...dragStart, y: dragStart.y - 40 });
  assert.deepEqual(actions, []);
  c.handle('campaign:adventure');
  page.resize(createViewport({ width: 320, height: 568 }));
  assert.equal(c.levelCampaign, 'adventure');
  assert.equal(page.entries.length, 12);
  assert.equal(page.scrollOffsets.adventure, 0);
  assert.deepEqual(page.entries.map(({ level }) => level.id), [
    ...Array.from({ length: 6 }, (_, index) => `adventure-switches-${index + 1}`),
    ...Array.from({ length: 6 }, (_, index) => `adventure-weights-${index + 1}`),
  ]);
  c.handle('campaign:coop');
  assert.equal(c.roomMode, 'coop');
  assert.equal(c.modal, 'pk-choice');
  c.handle('levels');
  c.handle('campaign:classic'); page.resize(createViewport({ width: 320, height: 568 }));
  assert.equal(page.scrollOffsets.classic, page.maxScroll);
});

test('画廊覆盖所有关卡并保持点击路由', () => {
  const c = new GameController({ readStorage: () => null });
  const actions = [];
  const page = new LevelsPage(c, action => actions.push(action));
  c.handle('campaign:classic');
  page.resize(createViewport({ width: 320, height: 568 }));
  const seen = new Set();
  for (let offset = 0; offset <= page.maxScroll + 220; offset += 220) {
    page.scrollBy(220);
    page.buttons.filter(button => button.id.startsWith('level:')).forEach(button => seen.add(button.id));
  }
  assert.ok(seen.has(`level:${page.entries.at(-1).index}`));
  const click = id => {
    const button = page.buttons.find(item => item.id === id);
    assert.ok(button, id);
    const point = { id: 1, x: button.x + button.width / 2, y: button.y + button.height / 2 };
    page.handlePointer('start', point);
    page.handlePointer('end', point);
  };
  page.scrollOffsets.classic = 0;
  page.layout();
  assert.equal(page.buttons.some(button => button.id === 'gallery:current'), false);
  click('level:0');
  assert.deepEqual(actions, ['level:0']);
  assert.ok(!page.buttons.some(button => button.id.startsWith('chapter:')));
});

test('旧存档在重排和缩减目录后保留成绩、已开放地图及未发布地图记录', () => {
  let saved = { records: Object.fromEntries(Array.from({ length: 21 }, (_, i) =>
    [`selfboot-${i + 1}`, { bestSteps: 120, stars: 2 }])) };
  const platform = { readStorage: () => saved, writeStorage: (_, value) => { saved = value; } };
  const c = new GameController(platform);
  levels.forEach((level, index) => {
    if (level.sourceNumber <= 22) assert.equal(c.progress.isUnlocked(index), true);
  });
  assert.equal(c.progress.completedLevels, 1 + levels.filter(level => level.sourceNumber <= 21).length);
  assert.deepEqual(c.progress.state.records['classic-learn-1'], { bestSteps: 4, stars: 3 });
  c.progress.finish(levels[0], 1, 3);
  const restored = new GameController(platform);
  assert.deepEqual(restored.progress.state.records['selfboot-6'], { bestSteps: 120, stars: 2 });
  assert.equal(restored.progress.isUnlocked(0), true);
  assert.equal(restored.progress.isUnlocked(1), true);
});

test('旧教学关记录不会占用新的经典关卡进度', () => {
  const saved = { records: Object.fromEntries(Array.from({ length: 6 }, (_, i) =>
    [`onboarding-${i + 1}`, { bestSteps: i + 1, stars: 3 }])) };
  const c = new GameController({ readStorage: () => saved });
  assert.equal(c.progress.completedLevels, 0);
  assert.equal(c.progress.isUnlocked(0), true);
  assert.equal(c.progress.isUnlocked(1), false);
  assert.equal(c.resumeLevelIndex('classic'), 0);
  assert.deepEqual(c.progress.state.records['onboarding-1'], { bestSteps: 1, stars: 3 });
});

test('未标定星级的地图正常计步、保存和解锁', () => {
  let saved;
  const platform = { readStorage: () => saved, writeStorage: (_, value) => { saved = value; } };
  const catalog = [0, 1].map(i => ({ id: `unrated-${i}`, difficulty: 'group', rows: ['#####', '#@$.#', '#####'] }));
  const c = new GameController(platform, catalog);
  c.openLevel(0); c.handle('skip'); c.handle('right');
  assert.equal(c.modal, 'win');
  assert.equal(c.result.stars, 0);
  assert.equal(c.result.steps, 1);
  const restored = new GameController(platform, catalog);
  assert.equal(restored.progress.unlocked, 1);
  assert.deepEqual(restored.progress.state.records['unrated-0'], { bestSteps: 1, stars: 0 });
});
