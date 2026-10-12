// Usage: node tools/build-art.cjs [path-to-sharp]
// Sharp is a development-only converter; the game has no runtime dependency.
const sharp = require(process.argv[2] || 'sharp');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const regions = [[444, 444], [814, 0], [74, 0], [296, 0], [74, 222], [0, 370], [0, 222]];
async function main() {
  const sheet = await sharp(path.join(root, 'assets/source/sokoban.svg'), { density: 216 }).png().toBuffer();
  const sprites = await Promise.all(regions.map(async ([x, y], index) => ({
    input: await sharp(sheet).extract({ left: x * 3, top: y * 3, width: 192, height: 192 }).png().toBuffer(),
    left: index * 192, top: 0,
  })));
  await sharp({ create: { width: regions.length * 192, height: 192, channels: 4, background: '#00000000' } })
    .composite(sprites).png().toFile(path.join(root, 'assets/sokoban.png'));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
