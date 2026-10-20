import test from 'node:test';
import assert from 'node:assert/strict';
import { soundForAction, soundSources, musicSource } from '../src/audio.js';

const snapshot = (steps, boxes, goals = [2], modal = null) => ({
  steps, boxes, goals: new Set(goals), modal,
});

test('音频资源全部使用稳定的包内路径', () => {
  assert.match(musicSource, /^assets\/audio\/.*\.wav$/);
  assert.deepEqual(Object.keys(soundSources),
    ['tap', 'step', 'push', 'goal', 'undo', 'blocked', 'deadlock', 'win']);
  Object.values(soundSources).forEach(source => assert.match(source, /^assets\/audio\/.*\.wav$/));
});

test('移动事件区分行走、推箱、到点、卡死和通关', () => {
  assert.equal(soundForAction('right', snapshot(0, [1]), snapshot(1, [1])), 'step');
  assert.equal(soundForAction('right', snapshot(0, [1]), snapshot(1, [3])), 'push');
  assert.equal(soundForAction('right', snapshot(0, [1]), snapshot(1, [2])), 'goal');
  assert.equal(soundForAction('right', snapshot(0, [1]), snapshot(0, [1])), 'blocked');
  assert.equal(soundForAction('right', snapshot(0, [1]), snapshot(1, [3], [2], 'deadlock')), 'deadlock');
  assert.equal(soundForAction('right', snapshot(0, [1]), snapshot(1, [2], [2], 'win')), 'win');
});

test('撤销和普通界面操作使用对应的短音效', () => {
  assert.equal(soundForAction('undo', snapshot(2, [3]), snapshot(1, [2])), 'undo');
  assert.equal(soundForAction('settings', snapshot(null, []), snapshot(null, [])), 'tap');
});
