import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadArt, drawArt, drawCharacterFrame, drawCrate, drawWall, sprites, artSource,
  artFileIDs, characterSources, environmentSources } from '../src/ui/art.js';

test('地图图集改由云存储加载，不再加入小游戏本地包', () => {
  const config = JSON.parse(readFileSync(new URL('../project.config.json', import.meta.url)));
  const included = config.packOptions.include.map(({ value }) => value);
  assert.equal(included.length, 0);
  assert.match(artSource, /\/images\/generated\/map-v2\/map-tiles-4x4\.png$/);
  Object.values(environmentSources).forEach(source => assert.match(source, /^https:\/\//));
  Object.values(artFileIDs).forEach(fileID => assert.match(fileID, /^cloud:\/\//));
  assert.equal(environmentSources.ground, undefined);
  assert.equal(environmentSources.innerWall, undefined);
});

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
  assert.equal(created, 1 + Object.keys(environmentSources).length + Object.keys(characterSources).length);
  assert.deepEqual(images.map(image => image.src), [artSource, ...Object.values(environmentSources),
    characterSources.walk, characterSources.push]);
  assert.equal(drawArt(ctx, 'crate', 10, 20, 30), false);
  images.forEach(image => image.onload());
  assert.equal(drawWall(ctx, 10, 20, 30), true);
  assert.deepEqual(calls.at(-1).slice(0, 5), [images[1], 126, 140, 1002, 980]);
  assert.deepEqual(calls.at(-1).slice(5), [10.45, 20.45, 29.1, 29.1]);
  assert.equal(drawCrate(ctx, 10, 20, 100), true);
  const crateCall = calls.at(-1);
  assert.deepEqual(crateCall.slice(0, 5), [images[2], 41, 928, 271, 270]);
  assert.ok(Math.abs(crateCall[5] + crateCall[7] / 2 - 60) < 1e-9);
  assert.ok(Math.abs(crateCall[6] + crateCall[8] / 2 - 70) < 1e-9);
  Object.keys(sprites).forEach(name => {
    assert.equal(drawArt(ctx, name, 10, 20, 30), true);
    const [sourceX, sourceY, sourceWidth, sourceHeight] = sprites[name];
    assert.deepEqual(calls.at(-1).slice(0, 5),
      [images[0], sourceX, sourceY, sourceWidth, sourceHeight]);
  });
  const characterOffset = 1 + Object.keys(environmentSources).length;
  assert.equal(drawCharacterFrame(ctx, 'left', 'push', 2, 10, 20, 30), true);
  assert.deepEqual(calls.at(-1).slice(0, 5), [images[characterOffset + 1], 635, 834, 261, 359]);
  assert.equal(calls.at(-1)[8], 26.4);
  assert.equal(drawCharacterFrame(ctx, 'right', 'walk', 1, 4, 5, 24), true);
  assert.deepEqual(calls.at(-1).slice(0, 5), [images[characterOffset], 967, 450, 246, 344]);
  assert.equal(calls.at(-1)[8], 21.12);
  assert.equal(drawArt({}, 'crate', 0, 0, 32), false);
  assert.equal(drawCharacterFrame({}, 'down', 'walk', 1, 0, 0, 32), false);
  assert.equal(drawArt(ctx, 'unknown', 0, 0, 32), false);
});

test('地图图集和人物动画提供云端公开地址回退', async () => {
  const images = [];
  const platform = {
    createImage: () => {
      const image = { width: 1254, height: 1254 };
      images.push(image);
      return image;
    },
  };
  loadArt({}, platform);
  await Promise.resolve();
  assert.equal(images[0].src, artSource);
  const characterOffset = 1 + Object.keys(environmentSources).length;
  assert.deepEqual(images.slice(1, characterOffset).map(image => image.src), Object.values(environmentSources));
  assert.deepEqual(images.slice(characterOffset).map(image => image.src),
    [characterSources.walk, characterSources.push]);
  images[0].onerror();
  assert.equal(images[0].src, artSource);
});
