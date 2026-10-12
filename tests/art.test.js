import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadArt, drawArt, sprites } from '../src/ui/art.js';

test('图集加载完成前不绘制、每个上下文只加载一次、加载后裁切正确', () => {
  const calls = [];
  const ctx = { drawImage: (...args) => calls.push(args) };
  const image = {};
  let created = 0;
  const platform = { createImage: () => { created++; return image; } };
  loadArt(ctx, platform); loadArt(ctx, platform);
  assert.equal(created, 1);
  assert.equal(image.src, 'assets/sokoban.png');
  assert.equal(drawArt(ctx, 'crate', 10, 20, 30), false);
  image.onload();
  Object.keys(sprites).forEach(name => {
    assert.equal(drawArt(ctx, name, 10, 20, 30), true);
    assert.deepEqual(calls.at(-1), [image, sprites[name] * 192, 0, 192, 192, 10, 20, 30, 30]);
  });
  assert.equal(drawArt({}, 'crate', 0, 0, 32), false);
  assert.equal(drawArt(ctx, 'unknown', 0, 0, 32), false);
});

test('本地图集尺寸与裁切配置一致，源文件排除出小游戏包', () => {
  const png = readFileSync(new URL('../assets/sokoban.png', import.meta.url));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 192 * Object.keys(sprites).length);
  assert.equal(png.readUInt32BE(20), 192);
  const config = JSON.parse(readFileSync(new URL('../project.config.json', import.meta.url)));
  assert.ok(config.packOptions.ignore.some(entry => entry.value === 'assets/source'));
});
