import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { WALK_ATLAS, SCROLL_SPEED, walkFrameAt, scrollStateAt,
  goalPositionsAt, walkGroupPlacement, drawMirroredLayer } from '../src/pages/home/scrolling-scene.js';
import { homeVisualSources, loadHomeVisuals, homeMotionReady,
  drawHomeWalkFrame, walkFootAt } from '../src/ui/home-visual-v1.js';

const viewport = { width: 414, height: 896 };
const scene = { x: -15, y: 246, width: 445, height: 334 };

test('十二帧推箱步态按时间循环，上身与木箱接触点保持稳定', () => {
  assert.deepEqual([0, .08, .24, .48, .88, .96, NaN].map(walkFrameAt),
    [0, 1, 3, 6, 11, 0, 0]);
  for (let frame = 0; frame < WALK_ATLAS.frames; frame += 1) {
    const state = { frame, baseline: 490 };
    const { hero, crate } = walkGroupPlacement(state, viewport.width);
    const scale = hero.width / WALK_ATLAS.cellWidth;
    const palmX = hero.x + 314 * scale;
    const frontContactX = crate.x + 323 / 1333 * crate.width;
    assert.ok(Math.abs(palmX - frontContactX) < 1);
    assert.ok(Math.abs(hero.y + 352 * scale - state.baseline) < 1e-8);
    assert.ok(Math.abs(crate.width / crate.height - 1333 / 1180) < 1e-8);
  }
});

test('道路快于远景，目标格每两段道路经过一次', () => {
  assert.ok(SCROLL_SPEED.far < SCROLL_SPEED.meadow);
  assert.ok(SCROLL_SPEED.meadow < SCROLL_SPEED.road);
  assert.ok(SCROLL_SPEED.road < SCROLL_SPEED.foreground);
  const first = scrollStateAt(0, viewport, scene);
  const visible = scrollStateAt(10, viewport, scene);
  const afterPeriod = scrollStateAt(10 + first.roadWidth * 2 / SCROLL_SPEED.road, viewport, scene);
  assert.equal(first.frame, 0);
  assert.ok(first.roadWidth > viewport.width);
  assert.ok(Math.abs(goalPositionsAt(visible, viewport.width)[0]
    - goalPositionsAt(afterPeriod, viewport.width)[0]) < 1e-8);
  assert.ok(first.baseline > first.roadY && first.baseline < first.roadY + first.roadHeight);
});

test('落地脚的回退速度接近道路速度，另一只脚在摆动期抬起', () => {
  const stanceDistance = walkFootAt(0).x - walkFootAt(.6 - 1e-6).x;
  const roadDistance = SCROLL_SPEED.road * WALK_ATLAS.duration * .6;
  assert.ok(Math.abs(stanceDistance - roadDistance) < 2);
  assert.equal(walkFootAt(.3).lift, 0);
  assert.ok(walkFootAt(.8).lift < -9);
  assert.ok(walkFootAt(.3, .5).lift < -9);
  assert.deepEqual(walkFootAt(0), walkFootAt(1));
});

test('相邻道路以镜像原图边缘连接，不拉伸单片', () => {
  const calls = [];
  const ctx = new Proxy({}, { get: (_, name) => (...args) => calls.push([name, ...args]) });
  const tiles = [];
  drawMirroredLayer(ctx, 'road', (_, rect) => tiles.push(rect), 414, 200, 300, 150, 298);
  assert.equal(tiles.length, 3);
  assert.ok(tiles.every(tile => tile.width === 300 && tile.height === 150));
  assert.deepEqual(calls.filter(call => call[0] === 'scale').map(call => call.slice(1)), [[-1, 1]]);
});

test('本地行走资产尺寸、alpha、加载回退与图集裁切正确', async () => {
  const game = JSON.parse(readFileSync(new URL('../game.json', import.meta.url), 'utf8'));
  const project = JSON.parse(readFileSync(new URL('../project.config.json', import.meta.url), 'utf8'));
  const root = game.subPackages.find(pack => pack.name === 'visualHome')?.root;
  assert.equal(root, 'images/visual-v1/home/');
  assert.ok(existsSync(new URL(`../${root}game.js`, import.meta.url)));
  for (const source of Object.values(homeVisualSources)) {
    assert.ok(source.startsWith(root));
    assert.ok(existsSync(new URL(`../${source}`, import.meta.url)));
    assert.ok(!project.packOptions.ignore.some(({ value }) => value === source));
  }
  for (const [name, size, rgba] of [
    ['gardenFar', [2087, 754], false], ['gardenRoad', [2086, 754], true],
    ['gardenForeground', [2086, 754], true], ['walkFrames', [1448, 1086], true],
    ['goalBase', [1448, 1086], true],
  ]) {
    const png = readFileSync(new URL(`../${homeVisualSources[name]}`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], size);
    assert.equal(png[25] === 6, rgba);
  }
  const images = [];
  const ctx = { drawImage: (...args) => { ctx.draws.push(args); },
    draws: [], save() {}, restore() {}, translate() {}, rotate() {},
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, clip() {}, globalAlpha: 1 };
  const pending = loadHomeVisuals(ctx, { createImage() {
    const image = {};
    images.push(image);
    return image;
  } });
  assert.equal(homeMotionReady(ctx), false);
  images.forEach(image => image.onload());
  await pending;
  assert.equal(homeMotionReady(ctx), true);
  assert.equal(drawHomeWalkFrame(ctx, 11, 1, 2, 3, 4), true);
  assert.deepEqual(ctx.draws[0].slice(1, 5), [27, 282, 130, 80]);
  assert.deepEqual(ctx.draws[1].slice(1, 5), [149, 282, 134, 80]);
  assert.deepEqual(ctx.draws.at(-1).slice(1, 5), [0, 0, 362, 362]);

  const failedImages = [];
  const failedCtx = {};
  const fallback = loadHomeVisuals(failedCtx, { createImage() {
    const image = {};
    failedImages.push(image);
    return image;
  } });
  const names = Object.keys(homeVisualSources);
  failedImages.forEach((image, index) => {
    if (names[index] === 'gardenRoad') image.onerror();
    else image.onload();
  });
  await fallback;
  assert.equal(homeMotionReady(failedCtx), false);
});
