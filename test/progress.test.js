import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProgress, completeLevel } from '../src/core/progress.js';

test('progress unlocks next level and preserves best moves', () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) };
  let progress = loadProgress(storage);
  assert.equal(progress.unlocked, 1);
  progress = completeLevel(storage, progress, 1, 12);
  progress = completeLevel(storage, progress, 1, 15);
  assert.equal(loadProgress(storage).completed[1], 12);
  assert.equal(loadProgress(storage).unlocked, 2);
});
