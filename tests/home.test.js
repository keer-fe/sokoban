import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewport, toLogicalPoint } from '../src/core/viewport.js';
import { getHomeLayout } from '../src/pages/home/layout.js';
import { ButtonInput } from '../src/ui/button.js';
import { createApp } from '../src/app.js';
import { normalizeWechatWindowInfo } from '../src/platform/wechat.js';

test('微信模拟器胶囊返回空对象时使用安全区域回退，所有绘制坐标保持有效', () => {
  // Captured from WeChat DevTools 2.02.2608080 / base library 3.17.4.
  const info = { pixelRatio: 3, windowWidth: 390, windowHeight: 844, statusBarHeight: 47,
    safeArea: { top: 47, bottom: 810 } };
  for (const capsule of [{}, null, undefined, { bottom: NaN }, { bottom: 0 }]) {
    const normalized = normalizeWechatWindowInfo(info, capsule);
    assert.equal(normalized.safeTop, 91);
    assert.equal(normalized.safeBottom, 34);
    const viewport = createViewport(normalized);
    Object.values(viewport).forEach((value) => assert.ok(Number.isFinite(value)));
    const layout = getHomeLayout(viewport);
    assert.ok(layout.top * viewport.scale > 91);
    assert.ok(layout.stats.y + layout.stats.height < layout.questionsY);
  }
  assert.equal(normalizeWechatWindowInfo(info, { bottom: 83 }).safeTop, 83);
});

test('视口拒绝无效宽高，并阻止 NaN 安全区和像素比污染变换矩阵', () => {
  const viewport = createViewport({ width: 390, height: 844, safeTop: NaN,
    safeBottom: Infinity, pixelRatio: NaN });
  Object.values(viewport).forEach((value) => assert.ok(Number.isFinite(value)));
  assert.equal(viewport.pixelRatio, 1);
  assert.throws(() => createViewport({ width: 0, height: 844 }), /Invalid canvas viewport/);
});

test('首页在短屏、全面屏及横屏中不遮挡按钮，坐标转换不受 DPR 影响', () => {
  for (const [width, height, safeTop, safeBottom] of [
    [320, 568, 0, 0], [375, 667, 64, 0], [390, 844, 96, 34], [414, 896, 88, 34], [844, 390, 0, 21],
  ]) {
    for (const pixelRatio of [1, 2, 3]) {
      const viewport = createViewport({ width, height, safeTop, safeBottom, pixelRatio });
      const layout = getHomeLayout(viewport);
      assert.ok(layout.top * viewport.scale >= safeTop);
      assert.ok(layout.stats.y + layout.stats.height + 10 < layout.questionsY);
      layout.buttons.forEach((button) => {
        const center = { id: 1, x: button.x + button.width / 2, y: button.y + button.height / 2 };
        const point = toLogicalPoint(viewport, { id: 1,
          x: center.x * viewport.scale + viewport.offsetX, y: center.y * viewport.scale });
        assert.ok(Math.abs(point.x - center.x) < 0.001 && Math.abs(point.y - center.y) < 0.001);
      });
    }
  }
});

test('按钮点击只触发一次，拖出、取消和其他手指不会误触', () => {
  const actions = [];
  const input = new ButtonInput(() => [{ id: 'start', x: 10, y: 10, width: 100, height: 50 }],
    (id) => actions.push(id));
  const inside = { id: 1, x: 30, y: 30 };
  input.handle('end', inside);
  input.handle('start', inside);
  input.handle('end', { ...inside, id: 2 });
  assert.equal(input.activeId, 'start');
  input.handle('end', inside);
  input.handle('end', inside);
  assert.deepEqual(actions, ['start']);
  input.handle('start', inside);
  input.handle('move', { ...inside, x: 200 });
  input.handle('end', inside);
  input.handle('start', inside);
  input.handle('cancel', inside);
  input.handle('end', inside);
  assert.equal(actions.length, 1);
});

test('生命周期重复启动不叠加动画，隐藏停止，销毁解绑', () => {
  const context = new Proxy({ measureText: (value) => ({ width: value.length * 10 }) }, {
    get: (target, key) => key in target ? target[key] : () => {},
  });
  const frames = new Map();
  let frameId = 0;
  let subscriptions = 0;
  let callbacks;
  const app = createApp({
    canvas: { getContext: () => context }, now: () => 1000,
    getWindowInfo: () => ({ width: 390, height: 844, pixelRatio: 3, safeTop: 90, safeBottom: 34 }),
    requestFrame: (fn) => { frames.set(++frameId, fn); return frameId; },
    cancelFrame: (id) => frames.delete(id), notify: () => {},
    subscribe(value) { callbacks = value; subscriptions += 1; return () => { subscriptions -= 1; }; },
  });
  app.start(); app.start();
  assert.equal(subscriptions, 1);
  assert.equal(frames.size, 1);
  callbacks.hide();
  assert.equal(frames.size, 0);
  callbacks.show(); callbacks.show();
  assert.equal(frames.size, 1);
  callbacks.resize();
  assert.equal(frames.size, 1);
  app.destroy();
  assert.equal(frames.size, 0);
  assert.equal(subscriptions, 0);
});
