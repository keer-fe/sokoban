import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { levels } from '../src/game/levels.js';
import { GameSession, parseLevel } from '../src/game/engine.js';
import { GameController } from '../src/game/controller.js';
import { solve as bfsSolve } from '../tools/solve-levels.js';
import { LevelsPage } from '../src/pages/levels/index.js';
import { createViewport } from '../src/core/viewport.js';

test('开放地图保留原始内容和稳定 ID，教学关独立编号', () => {
  const source = JSON.parse(readFileSync(new URL('../docs/levels-original.json', import.meta.url))).levels;
  const tiles = ['_', '#', ' ', '.', '$', '*', '@', '+'];
  assert.equal(levels.length, 106);
  assert.deepEqual(levels.slice(6).map(level => level.sourceNumber), Array.from({ length: 100 }, (_, i) => i + 1));
  assert.equal(new Set(levels.map(level => level.id)).size, levels.length);
  levels.filter(level => level.sourceNumber).forEach(level => {
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

test('统一分页覆盖所有开放关卡，返回选关保留当前关所在页', () => {
  const c = new GameController({ readStorage: () => null });
  const page = new LevelsPage(c, () => {});
  const ids = [];
  for (let i = 0; i < Math.ceil(c.levels.length / 12); i++) {
    page.resize(createViewport({ width: 320, height: 568 }));
    ids.push(...page.entries.map(entry => entry.index));
    assert.ok(page.buttons.every(button => !button.id.startsWith('filter:')));
    c.handle('following');
  }
  assert.deepEqual(ids, Array.from({ length: levels.length }, (_, i) => i));
  assert.equal(c.listPage, 8);
  c.levelIndex = levels.length - 1;
  c.navigate('levels');
  assert.equal(c.listPage, 8);
});

test('前六个教学关逐步增加步数', () => {
  assert.deepEqual(levels.slice(0, 6).map(level => level.minSteps), [1, 3, 3, 4, 5, 8]);
  assert.ok(levels.slice(0, 6).every(level => level.difficulty === '简单'));
});

test('旧存档在重排和缩减目录后保留成绩、已开放地图及未发布地图记录', () => {
  let saved = { records: Object.fromEntries(Array.from({ length: 21 }, (_, i) =>
    [`selfboot-${i + 1}`, { bestSteps: 120, stars: 2 }])) };
  const platform = { readStorage: () => saved, writeStorage: (_, value) => { saved = value; } };
  const c = new GameController(platform);
  levels.forEach((level, index) => {
    if (level.sourceNumber <= 22) assert.equal(c.progress.isUnlocked(index), true);
  });
  assert.equal(c.progress.completedLevels, levels.filter(level => level.sourceNumber <= 21).length);
  c.progress.finish(levels[0], 1, 3);
  const restored = new GameController(platform);
  assert.deepEqual(restored.progress.state.records['selfboot-6'], { bestSteps: 120, stars: 2 });
  assert.equal(restored.progress.isUnlocked(0), true);
  assert.equal(restored.progress.isUnlocked(1), true);
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
