import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? files(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]));
  return nested.flat();
}
const sources = ['game.js', ...(await files('src')), ...(await files('preview')),
  ...(await files('tools')), ...(await files('tests'))];
for (const file of sources.filter((name) => name.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(1);
}
for (const file of ['game.json', 'project.config.json', 'package.json']) {
  JSON.parse(await readFile(file, 'utf8'));
}
console.log('JavaScript syntax and JSON configuration OK');
