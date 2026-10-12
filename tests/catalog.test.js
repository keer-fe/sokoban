import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { levels, difficulties } from '../src/game/levels.js';
import { GameSession, parseLevel } from '../src/game/engine.js';
import { GameController } from '../src/game/controller.js';
import { solve } from '../tools/solve-levels.js';
import { LevelsPage } from '../src/pages/levels/index.js';
import { createViewport } from '../src/core/viewport.js';

test('100 关逐格匹配原始地图，保留空洞、目标上的人物与箱子', () => {
  const source = JSON.parse(readFileSync(new URL('../docs/levels-original.json', import.meta.url))).levels;
  const tiles = ['_', '#', ' ', '.', '$', '*', '@', '+'];
  assert.equal(levels.length, 100);
  levels.forEach((level, index) => {
    assert.equal(level.sourceNumber, index + 1);
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
  levels.filter(level => level.minSteps).forEach(level => {
    const path = solve(level);
    assert.equal(path.length, level.minSteps);
    const game = new GameSession(level);
    path.forEach(direction => assert.equal(game.move(direction), true));
    assert.equal(game.complete, true);
  });
});

test('选关分页覆盖全部 100 关，返回选关保留当前关所在页', () => {
  const c = new GameController({ readStorage: () => null });
  const page = new LevelsPage(c, () => {});
  const ids = [];
  difficulties.forEach(group => {
    c.handle(`filter:${group}`);
    for (let i = 0; i < Math.ceil(c.levels.filter(level => level.difficulty === group).length / 12); i++) {
      page.resize(createViewport({ width: 320, height: 568 }));
      ids.push(...page.entries.map(entry => entry.index));
      c.handle('following');
    }
  });
  assert.deepEqual(ids, Array.from({ length: 100 }, (_, i) => i));
  c.levelIndex = 99;
  c.navigate('levels');
  assert.equal(c.filter, difficulties[2]);
  assert.equal(c.listPage, 3);
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
