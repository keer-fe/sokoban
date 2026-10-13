import test from 'node:test';
import assert from 'node:assert/strict';
import { GameSession, parseLevel } from '../src/game/engine.js';
import { detectDeadlock, findDeadSquares } from '../src/game/deadlock.js';
import { GameController } from '../src/game/controller.js';

const level = { id: 'deadlock-test', rows: ['#######', '#     #', '# $@ .#', '#     #', '#######'] };

test('推入非目标贴墙死格后检测死锁，撤销和重开恢复状态', () => {
  const game = new GameSession(level);
  assert.equal(game.deadlock, null);
  assert.equal(game.move('left'), true);
  assert.equal(game.deadlock.kind, 'dead-square');
  assert.equal(game.undo(), true);
  assert.equal(game.deadlock, null);
  game.move('left'); game.restart();
  assert.equal(game.deadlock, null);
  assert.equal(game.state.steps, 0);
});

test('非目标角落、空洞边界可检测，目标角落和可沿墙推往目标的位置不误报', () => {
  for (const rows of [
    ['#####', '#$ @#', '# . #', '#####'],
    ['_____', '_$ @_', '_ . _', '_____'],
  ]) assert.equal(new GameSession({ rows }).deadlock.kind, 'dead-square');
  for (const rows of [
    ['#####', '#* @#', '#   #', '#####'],
    ['#######', '#@$  .#', '#######'],
  ]) assert.equal(new GameSession({ rows }).deadlock, null);
});

test('箱子之间的 2×2 死锁、箱墙混合死锁与全在目标上的冻结箱子', () => {
  const rows = ['########', '#@     #', '# $$   #', '# $$   #', '# .... #', '#      #', '########'];
  const board = parseLevel({ rows });
  assert.ok(board.boxes.every(pos => !findDeadSquares(board).has(pos)));
  assert.equal(detectDeadlock(board, board).kind, 'blocked-square');
  const mixed = parseLevel({ rows: ['########', '#@     #', '# ##   #', '# $$   #', '# ..   #', '#      #', '########'] });
  assert.ok(mixed.boxes.every(pos => !findDeadSquares(mixed).has(pos)));
  assert.equal(detectDeadlock(mixed, mixed).kind, 'blocked-square');
  assert.equal(new GameSession({ rows: ['######', '#@   #', '# ** #', '# ** #', '#    #', '######'] }).deadlock, null);
});

function controller(cards = 0, failSave = false) {
  const c = new GameController({
    readStorage: () => ({ cards, tutorialDone: true }), notify: () => {},
    writeStorage: () => { if (failSave) throw new Error('storage full'); },
  }, [level]);
  c.openLevel(0);
  return c;
}

test('死锁弹窗阻断移动，撤销扣卡并恢复；重复进入死锁仍提示', () => {
  const c = controller(2);
  c.handle('left');
  assert.equal(c.modal, 'deadlock');
  c.handle('up');
  assert.equal(c.game.state.steps, 1);
  assert.equal(c.progress.completedLevels, 0);
  c.handle('undo');
  assert.equal(c.modal, null);
  assert.equal(c.game.deadlock, null);
  assert.equal(c.progress.state.cards, 1);
  c.handle('left');
  assert.equal(c.modal, 'deadlock');
  c.handle('close'); c.handle('up');
  assert.equal(c.modal, null);
  c.handle('menu'); c.handle('restart');
  assert.equal(c.game.deadlock, null);
});

test('死锁可免费重开，缺卡或扣卡保存失败不会撤销棋盘', () => {
  const c = controller();
  c.handle('left'); c.handle('undo');
  assert.equal(c.modal, 'cards');
  assert.equal(c.game.state.steps, 1);
  c.handle('close'); c.handle('menu'); c.handle('restart');
  c.handle('left'); c.handle('restart');
  assert.equal(c.modal, null);
  assert.equal(c.game.state.steps, 0);
  assert.equal(c.game.deadlock, null);
  const failed = controller(1, true);
  failed.handle('left'); failed.handle('undo');
  assert.equal(failed.progress.state.cards, 1);
  assert.equal(failed.game.state.steps, 1);
});
