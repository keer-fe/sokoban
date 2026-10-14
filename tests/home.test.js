import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewport, toLogicalPoint } from '../src/core/viewport.js';
import { getHomeLayout } from '../src/pages/home/layout.js';
import { ButtonInput } from '../src/ui/button.js';
import { createApp } from '../src/app.js';
import { createWechatPlatform, normalizeWechatWindowInfo } from '../src/platform/wechat.js';
import { drawHomeBackground, drawHomeIcon, drawHomeSpriteFrame, homeBackgroundSource, homeIconFileIDs, homeIconSources, localPushAnimationSources, loadHomeIcons } from '../src/ui/home-icons.js';
import { HOME_FONT_FILE_ID, loadHomeFont } from '../src/ui/home-font.js';
import { drawPushAnimation } from '../src/pages/home/push-animation.js';

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
      assert.deepEqual(shortcuts.map(button => button.x), [332, 332, 8]);
      assert.deepEqual(shortcuts.map(button => button.y),
        [layout.top + 148, layout.top + 238, layout.top + 148]);
      const gameClub = layout.buttons.find(button => button.id === 'gameClub');
      assert.deepEqual({ x: gameClub.x, y: gameClub.y, native: gameClub.native,
        labelOffset: gameClub.labelOffset, nativeIconSize: gameClub.nativeIconSize },
      { x: 8, y: layout.top + 238, native: true, labelOffset: 61, nativeIconSize: 48 });
      assert.equal(gameClub.labelOffset, shortcuts[0].labelOffset);
      assert.ok(gameClub.nativeIconSize < gameClub.labelOffset);
      const mainButtons = layout.buttons.filter(button => ['start', 'levels'].includes(button.id));
      mainButtons.forEach(button => {
        assert.ok(button.y > groundTop);
        assert.ok(button.y + button.height < bottom);
      });
      assert.deepEqual(mainButtons.map(({ x, width, height }) => ({ x, width, height })), [
        { x: 52, width: 310, height: 88 },
        { x: 97, width: 220, height: 56 },
      ]);
      assert.equal(mainButtons[1].y + mainButtons[1].height, bottom - 34);
      assert.equal(mainButtons[1].y - (mainButtons[0].y + mainButtons[0].height), 18);
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
  const ctx = new Proxy({ drawImage: (...args) => calls.push(args) }, {
    get: (target, key) => key in target ? target[key] : () => {},
  });
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
  images[4].width = 2172;
  images[4].height = 724;
  assert.equal(drawHomeBackground(ctx, 0, 0, 414, 896), true);
  assert.equal(calls.at(-1)[0], images[4]);
  assert.equal(calls.at(-1).at(-1), 896);
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

test('加载人物动画只使用包内素材，不等待或进入云资源清单', () => {
  assert.equal(homeBackgroundSource,
    'https://636c-cloud1-d5gqpaioo2d8acf27-1443887035.tcb.qcloud.la/images/animation/push-outdoor-background-v1.png');
  assert.equal(homeIconFileIDs.background,
    'cloud://cloud1-d5gqpaioo2d8acf27.636c-cloud1-d5gqpaioo2d8acf27-1443887035/images/animation/push-outdoor-background-v1.png');
  assert.deepEqual(localPushAnimationSources, {
    pushCharacterCycle: 'assets/animation/push-character-cycle-v2.png',
    pushCharacterUnderLegForward: 'assets/animation/push-character-under-leg-forward.png',
    pushCrate: 'assets/animation/push-crate-new.png',
  });
  Object.entries(localPushAnimationSources).forEach(([name, source]) => {
    assert.equal(name in homeIconFileIDs, false);
    assert.equal(source.startsWith('assets/animation/'), true);
    assert.equal(source.startsWith('cloud://'), false);
    assert.equal(source.startsWith('https://'), false);
  });

  const images = [];
  let resolveCloud;
  const ctx = {};
  loadHomeIcons(ctx, {
    createImage() {
      const image = {};
      images.push(image);
      return image;
    },
    resolveCloudFiles() {
      return new Promise((resolve) => { resolveCloud = resolve; });
    },
  });
  const animationImages = images.slice(-Object.keys(localPushAnimationSources).length);
  assert.deepEqual(animationImages.map((image) => image.src), Object.values(localPushAnimationSources));
  assert.equal(images[4].src, undefined);
  assert.equal(typeof resolveCloud, 'function');
});

test('首页人物固定在中间，背景随时间向左移动并镜像衔接', () => {
  const render = (elapsed) => {
    const translations = [];
    const scales = [];
    const clips = [];
    const ctx = new Proxy({
      translate(x, y) { translations.push([x, y]); },
      scale(x, y) { scales.push([x, y]); },
      rect(x, y, width, height) { clips.push([x, y, width, height]); },
    }, { get: (target, key) => key in target ? target[key] : () => {} });
    drawPushAnimation(ctx, 414, 500, elapsed);
    return { translations, scales, clips };
  };
  const first = render(0);
  const later = render(1);
  assert.deepEqual(first.translations[0], [(414 - 136 * 1.7) / 2, 500]);
  assert.deepEqual(later.translations[0], first.translations[0]);
  assert.deepEqual(first.scales[0], [1.7, 1.7]);
  assert.deepEqual(first.clips[0], [0, 500 - 96 * 1.7, 414, 176 * 1.7]);

  const draws = [];
  const transforms = [];
  const imageCtx = new Proxy({
    drawImage(...args) { draws.push(args); },
    translate(...args) { transforms.push(args); },
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  const images = [];
  loadHomeIcons(imageCtx, { createImage() {
    const image = {};
    images.push(image);
    return image;
  } });
  const backgroundImage = images[4];
  backgroundImage.width = 2172;
  backgroundImage.height = 724;
  backgroundImage.onload();
  const tileWidth = 2172 / (724 * 0.77) * 896;
  const seamTime = (tileWidth * 0.88 - 100) / 32;
  drawHomeBackground(imageCtx, 0, 0, 390, 896, seamTime);
  assert.equal(draws.length, 2);
  assert.equal(draws[0][0], backgroundImage);
  assert.equal(draws[1][0], backgroundImage);
  assert.equal(transforms.length, 1);
  assert.ok(Math.abs(draws[0][5] + draws[0][7] * 2 - transforms[0][0]) < 0.01);
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
  assert.equal(urls.title, 'https://signed.example/title-xiangbudao8-text-v2.png?token=test');
  assert.equal(urls.background, 'https://signed.example/push-outdoor-background-v1.png?token=test');
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

test('微信原生游戏圈按钮按首页布局创建、显隐并销毁', () => {
  let options;
  const calls = [];
  const nativeButton = {
    style: {},
    show() { calls.push('show'); },
    hide() { calls.push('hide'); },
    destroy() { calls.push('destroy'); },
  };
  const platform = createWechatPlatform({
    createCanvas: () => ({}),
    getOpenDataContext: () => null,
    createGameClubButton(value) { options = value; return nativeButton; },
  });
  platform.gameClubButton.update({ left: 320, top: 240, width: 52, height: 52 });
  assert.deepEqual(options, {
    icon: 'green', style: { left: 320, top: 240, width: 52, height: 52 },
  });
  platform.gameClubButton.show();
  platform.gameClubButton.update({ left: 300, top: 220, width: 48, height: 48 });
  assert.deepEqual(nativeButton.style, { left: 300, top: 220, width: 48, height: 48 });
  platform.gameClubButton.hide();
  platform.gameClubButton.destroy();
  assert.deepEqual(calls, ['show', 'show', 'hide', 'destroy']);
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
