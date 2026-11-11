import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/core/game.js';
import levels from '../src/core/levels.json' with { type: 'json' };

test('locked levels cannot be opened and starting a level resets its board', () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) };
  const game = createGame(storage);
  assert.equal(game.start(2), false);
  assert.equal(game.start(1), true);
  game.move('up');
  assert.equal(game.restart(), true);
  assert.equal(game.state.board.moves, 0);
});

test('hint follows a solvable path and a completed level survives reopening', () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) };
  const game = createGame(storage);
  game.start(1);
  assert.equal(game.showHint(), true);
  assert.equal(game.state.hint, { U: 'up', R: 'right', D: 'down', L: 'left' }[levels[0].solution[0]]);
  const directions = { U: 'up', R: 'right', D: 'down', L: 'left' };
  for (const step of levels[0].solution) game.move(directions[step]);
  assert.equal(game.state.screen, 'win');
  assert.equal(game.state.progress.unlocked, 2);
  assert.equal(createGame(storage).state.progress.completed[1], levels[0].solutionLength);
});
