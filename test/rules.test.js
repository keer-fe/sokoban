import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, move, undo, isWon } from '../src/core/rules.js';

test('walls and blocked pushes do not change state', () => {
  const state = parseLevel(['#####', '#@$.#', '#####']);
  assert.equal(move(state, 'up'), false);
  assert.equal(state.moves, 0);
  assert.equal(move(state, 'right'), true);
  assert.equal(isWon(state), true);
  assert.equal(move(state, 'right'), false);
  assert.equal(state.moves, 1);
});

test('undo restores player and crate', () => {
  const state = parseLevel(['#####', '#@$.#', '#####']);
  move(state, 'right');
  assert.equal(undo(state), true);
  assert.equal(state.player, '1,1');
  assert.equal(state.boxes.has('2,1'), true);
  assert.equal(state.moves, 0);
  assert.equal(state.pushes, 0);
  assert.equal(undo(state), false);
});

test('irregular board voids and bounds are not walkable', () => {
  const state = parseLevel(['~~~~~~', '~#  #~', '~#@$.~', '~####~', '~~~~~~']);
  assert.equal(move(state, 'up'), true);
  assert.equal(move(state, 'left'), false);
  assert.equal(move(state, 'right'), true);
});
