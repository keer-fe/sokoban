import { build } from 'esbuild';
import { mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';

rmSync('dist/web', { recursive: true, force: true });
rmSync('dist/wechat', { recursive: true, force: true });
mkdirSync('dist/web', { recursive: true });
mkdirSync('dist/wechat/assets/sfx', { recursive: true });
await Promise.all([
  build({ entryPoints: ['src/platform/web.js'], bundle: true, format: 'iife', outfile: 'dist/web/game.js', target: 'es2020' }),
  build({ entryPoints: ['src/platform/wechat.js'], bundle: true, format: 'iife', outfile: 'dist/wechat/game.js', target: 'es2020' })
]);
copyFileSync('index.html', 'dist/web/index.html');
let html = await import('node:fs').then(({ readFileSync }) => readFileSync('dist/web/index.html', 'utf8'));
html = html.replace('<script type="module" src="/src/platform/web.js"></script>', '<script src="./game.js"></script>');
writeFileSync('dist/web/index.html', html);
writeFileSync('dist/wechat/game.json', JSON.stringify({ deviceOrientation: 'portrait' }, null, 2));
writeFileSync('dist/wechat/project.config.json', JSON.stringify({
  appid: process.env.WECHAT_APPID || 'touristappid',
  projectname: '箱不到八',
  compileType: 'game',
  setting: { es6: true, minified: false, urlCheck: false }
}, null, 2));

function wav(frequency, durationMs) {
  const rate = 22050, count = Math.round(rate * durationMs / 1000);
  const data = Buffer.alloc(44 + count * 2);
  data.write('RIFF', 0); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i += 1) {
    const t = i / rate, attack = Math.min(1, t / .009);
    const envelope = attack * Math.exp(-4.3 * t / (durationMs / 1000));
    const note = Math.sin(2 * Math.PI * frequency * t) + .19 * Math.sin(2 * Math.PI * frequency * 2 * t);
    data.writeInt16LE(Math.round(note * envelope * 4300), 44 + i * 2);
  }
  return data;
}
for (const [name, frequency, duration] of [
  ['tap', 440, 95], ['step', 310, 72], ['push', 230, 135],
  ['goal', 620, 220], ['win', 770, 360]
]) writeFileSync(`dist/wechat/assets/sfx/${name}.wav`, wav(frequency, duration));
console.log('Built browser preview and WeChat Mini Game at dist/web and dist/wechat');
