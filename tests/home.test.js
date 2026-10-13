import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewport, toLogicalPoint } from '../src/core/viewport.js';
import { getHomeLayout } from '../src/pages/home/layout.js';
import { ButtonInput } from '../src/ui/button.js';
import { createApp } from '../src/app.js';
import { createWechatPlatform, normalizeWechatWindowInfo } from '../src/platform/wechat.js';
import { drawHomeBackground, drawHomeIcon, drawHomeSpriteFrame, homeIconFileIDs, homeIconSources, loadHomeIcons } from '../src/ui/home-icons.js';
import { HOME_FONT_FILE_ID, loadHomeFont } from '../src/ui/home-font.js';

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
    assert.ok(layout.cards.y + layout.cards.height < viewport.height - viewport.safeBottom);
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
      const bottom = viewport.height - viewport.safeBottom;
      const groundTop = bottom - layout.groundHeight;
      assert.ok(layout.title.y + layout.title.height < groundTop - 36);
      const shortcuts = layout.buttons.filter(button => button.icon);
      shortcuts.forEach(button => {
        assert.ok(button.y > layout.title.y + layout.title.height);
        assert.ok(button.y + button.height < groundTop - 36);
      });
      assert.equal(shortcuts[0].x, shortcuts[1].x);
      assert.ok(shortcuts[2].x > 300);
      assert.equal(layout.cards.x, shortcuts[2].x);
      assert.ok(layout.cards.y + layout.cards.height < groundTop - 36);
      const mainButtons = layout.buttons.filter(button => ['start', 'levels'].includes(button.id));
      mainButtons.forEach(button => {
        assert.ok(button.y > groundTop);
        assert.ok(button.y + button.height < bottom);
      });
      assert.equal(mainButtons[1].y + mainButtons[1].height, bottom - 46);
      assert.ok(mainButtons[0].width > mainButtons[1].width);
      assert.ok(mainButtons[0].height > mainButtons[1].height);
      layout.buttons.forEach((button) => {
        const center = { id: 1, x: button.x + button.width / 2, y: button.y + button.height / 2 };
        const point = toLogicalPoint(viewport, { id: 1,
          x: center.x * viewport.scale + viewport.offsetX, y: center.y * viewport.scale });
        assert.ok(Math.abs(point.x - center.x) < 0.001 && Math.abs(point.y - center.y) < 0.001);
      });
      assert.deepEqual(layout.buttons.filter(button => button.icon).map(button => button.id),
        ['signin', 'friends', 'settings']);
    }
  }
});

test('首页功能图标独立加载，未完成前回退、完成后分别绘制', () => {
  const calls = [];
  const loaded = [];
  const ctx = { drawImage: (...args) => calls.push(args) };
  const images = [];
  const platform = { createImage: () => {
    const image = {};
    images.push(image);
    return image;
  } };
  loadHomeIcons(ctx, platform, (name) => loaded.push(name));
  loadHomeIcons(ctx, platform);
  assert.equal(images.length, 11);
  assert.deepEqual(images.map(image => image.src), Object.values(homeIconSources));
  assert.equal(drawHomeIcon(ctx, 'signin', 1, 2, 48), false);
  images.forEach(image => image.onload());
  assert.deepEqual(loaded.sort(), Object.keys(homeIconFileIDs).sort());
  assert.equal(drawHomeIcon(ctx, 'signin', 1, 2, 48), true);
  assert.deepEqual(calls.at(-1), [images[1], 1, 2, 48, 48]);
  assert.equal(drawHomeIcon(ctx, 'title', 3, 4, 120, 43), true);
  assert.deepEqual(calls.at(-1), [images[3], 3, 4, 120, 43]);
  assert.equal(drawHomeBackground(ctx, 0, 0, 414, 896), true);
  assert.equal(calls.at(-1)[0], images[4]);
  assert.deepEqual(calls.at(-1).slice(-4), [0, 0, 414, 896]);
  assert.equal(drawHomeIcon(ctx, 'startButton', 32, 600, 350, 102), true);
  assert.deepEqual(calls.at(-1), [images[5], 32, 600, 350, 102]);
  assert.equal(drawHomeIcon(ctx, 'undoCard', 337, 300, 64), true);
  assert.deepEqual(calls.at(-1), [images[7], 337, 300, 64, 64]);
  assert.equal(drawHomeIcon(ctx, 'missing', 0, 0, 10), false);
  images[8].width = 1088;
  images[8].height = 362;
  assert.equal(drawHomeSpriteFrame(ctx, 'pushCharacterCycle', 2, 8, 10, 20, 84), true);
  assert.deepEqual(calls.at(-1), [images[8], 272, 0, 136, 362, 10, 20, 84, 84]);
});

test('微信平台通过 fileID 获取首页云端图片的签名地址', async () => {
  let initOptions;
  let requested;
  const api = {
    createCanvas: () => ({}),
    createImage: () => ({}),
    getOpenDataContext: () => null,
    cloud: {
      init: (options) => { initOptions = options; },
      getTempFileURL({ fileList, success }) {
        requested = fileList;
        queueMicrotask(() => success({ fileList: fileList.map((fileID) => ({
          tempFileURL: `https://signed.example/${fileID.split('/').at(-1)}?token=test`,
        })) }));
      },
    },
  };
  const platform = createWechatPlatform(api);
  assert.equal(initOptions.env, 'cloud1-d5gqpaioo2d8acf27');
  const urls = await platform.resolveCloudFiles(homeIconFileIDs);
  assert.deepEqual(requested, Object.values(homeIconFileIDs));
  assert.equal(urls.background, 'https://signed.example/home-background-v2.png?token=test');
});

test('首页艺术字体通过 fileID 获取临时地址，平台不支持时安全回退', async () => {
  let requested;
  let settled = 0;
  loadHomeFont({
    loadFont(url) { requested = url; return 'loaded-font'; },
    resolveCloudFiles: ({ homeFont }) => Promise.resolve({ homeFont: `signed:${homeFont}` }),
  }, () => { settled += 1; });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(requested, `signed:${HOME_FONT_FILE_ID}`);
  assert.equal(settled, 1);
  assert.ok(loadHomeFont({}));
});

test('微信平台先下载远程字体，再通过临时文件路径加载', async () => {
  let downloaded;
  let loaded;
  const api = {
    createCanvas: () => ({}),
    getOpenDataContext: () => null,
    downloadFile({ url, success }) {
      downloaded = url;
      success({ statusCode: 200, tempFilePath: 'wxfile://tmp/font.ttf' });
    },
    loadFont(path) { loaded = path; return 'wechat-font'; },
  };
  const platform = createWechatPlatform(api);
  assert.equal(await platform.loadFont('https://example.com/font.ttf'), 'wechat-font');
  assert.equal(downloaded, 'https://example.com/font.ttf');
  assert.equal(loaded, 'wxfile://tmp/font.ttf');
});

test('微信平台通过云文件 ID 下载字体，不依赖 downloadFile 域名白名单', async () => {
  let downloaded;
  let loaded;
  const api = {
    createCanvas: () => ({}),
    getOpenDataContext: () => null,
    cloud: {
      init() {},
      downloadFile({ fileID, success }) {
        downloaded = fileID;
        success({ tempFilePath: 'wxfile://cloud/font.ttf' });
      },
    },
    loadFont(path) { loaded = path; return 'cloud-font'; },
  };
  const platform = createWechatPlatform(api);
  assert.equal(await platform.loadCloudFont(HOME_FONT_FILE_ID), 'cloud-font');
  assert.equal(downloaded, HOME_FONT_FILE_ID);
  assert.equal(loaded, 'wxfile://cloud/font.ttf');
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
