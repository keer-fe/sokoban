import test from 'node:test';
import assert from 'node:assert/strict';
import { loadArt, drawArt, drawCharacterFrame, sprites, artFileID, artSource,
  characterSources } from '../src/ui/art.js';

test('图集加载完成前不绘制、每个上下文只加载一次、加载后裁切正确', () => {
  const calls = [];
  const ctx = { drawImage: (...args) => calls.push(args) };
  const images = [];
  let created = 0;
  const platform = { createImage: () => {
    created++;
    const image = { width: 1254, height: 1254 };
    images.push(image);
    return image;
  } };
  loadArt(ctx, platform); loadArt(ctx, platform);
  assert.equal(created, 3);
  assert.deepEqual(images.map(image => image.src), [artSource, characterSources.walk, characterSources.push]);
  assert.equal(drawArt(ctx, 'crate', 10, 20, 30), false);
  images.forEach(image => image.onload());
  Object.keys(sprites).forEach(name => {
    assert.equal(drawArt(ctx, name, 10, 20, 30), true);
    const [column, row] = sprites[name];
    assert.deepEqual(calls.at(-1), [images[0], column * 313.5, row * 313.5, 313.5, 313.5,
      10, 20, 30, 30]);
  });
  assert.equal(drawCharacterFrame(ctx, 'left', 'push', 2, 10, 20, 30), true);
  assert.deepEqual(calls.at(-1), [images[2], 627, 836, 313.5, 418, 10, 20, 30, 30]);
  assert.equal(drawCharacterFrame(ctx, 'right', 'walk', 1, 4, 5, 24), true);
  assert.deepEqual(calls.at(-1), [images[1], 940.5, 418, 313.5, 418, 4, 5, 24, 24]);
  assert.equal(drawArt({}, 'crate', 0, 0, 32), false);
  assert.equal(drawCharacterFrame({}, 'down', 'walk', 1, 0, 0, 32), false);
  assert.equal(drawArt(ctx, 'unknown', 0, 0, 32), false);
});

test('微信优先解析云端图集，人物动画使用本地素材', async () => {
  const images = [];
  const requested = [];
  const platform = {
    createImage: () => {
      const image = { width: 1254, height: 1254 };
      images.push(image);
      return image;
    },
    resolveCloudFiles(files) {
      requested.push(files);
      return Promise.resolve({ art: 'wxfile://cloud/sokoban-v2.png' });
    },
  };
  loadArt({}, platform);
  await Promise.resolve();
  assert.deepEqual(requested, [{ art: artFileID }]);
  assert.equal(images[0].src, 'wxfile://cloud/sokoban-v2.png');
  assert.deepEqual(images.slice(1).map(image => image.src),
    [characterSources.walk, characterSources.push]);
  images[0].onerror();
  assert.equal(images[0].src, artSource);
});
