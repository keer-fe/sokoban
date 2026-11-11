import { solveLevel } from '../src/core/solver.js';

let seed = 982451653;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
function pick(items) { return items[Math.floor(random() * items.length)]; }

const selected = [];
const seen = new Set();
for (let attempt = 0; attempt < 100000 && selected.length < 24; attempt += 1) {
  const size = selected.length < 6 ? 6 : selected.length < 16 ? 7 : 8;
  const boxesCount = selected.length < 9 ? 1 : selected.length < 19 ? 2 : 3;
  const cells = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) =>
    x === 0 || y === 0 || x === size - 1 || y === size - 1 ? '#' : ' '));
  const interior = [];
  for (let y = 1; y < size - 1; y += 1) for (let x = 1; x < size - 1; x += 1) interior.push([x, y]);
  const innerWalls = selected.length < 4 ? 0 : Math.floor(random() * (selected.length < 12 ? 3 : 5));
  for (let n = 0; n < innerWalls; n += 1) {
    const [x, y] = pick(interior);
    cells[y][x] = '#';
  }
  const spaces = interior.filter(([x, y]) => cells[y][x] === ' ');
  if (spaces.length < boxesCount * 2 + 1) continue;
  const chosen = [];
  while (chosen.length < boxesCount * 2 + 1) {
    const cell = pick(spaces);
    if (!chosen.includes(cell)) chosen.push(cell);
  }
  const [player, ...rest] = chosen;
  cells[player[1]][player[0]] = '@';
  for (let i = 0; i < boxesCount; i += 1) cells[rest[i][1]][rest[i][0]] = '$';
  for (let i = boxesCount; i < rest.length; i += 1) cells[rest[i][1]][rest[i][0]] = '.';
  const cuts = [
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[size - 1, 0], [size - 2, 0], [size - 1, 1], [size - 2, 1]],
    [[0, size - 1], [1, size - 1], [0, size - 2], [1, size - 2]],
    [[size - 1, size - 1], [size - 2, size - 1], [size - 1, size - 2], [size - 2, size - 2]]
  ];
  const cutOrder = [...cuts].sort(() => random() - 0.5);
  let cutCount = 0;
  for (const cut of cutOrder) {
    if (cutCount >= (selected.length < 8 ? 1 : selected.length < 16 ? 2 : 3)) break;
    if (cut.every(([x, y]) => cells[y][x] === '#' || cells[y][x] === ' ')) {
      cut.forEach(([x, y]) => { cells[y][x] = '~'; });
      cutCount += 1;
    }
  }
  if (!cutCount) continue;
  const rows = cells.map((row) => row.join(''));
  const path = solveLevel(rows, 40000);
  const min = selected.length < 5 ? 2 : selected.length < 12 ? 5 : selected.length < 20 ? 9 : 13;
  const max = selected.length < 8 ? 14 : selected.length < 18 ? 28 : 45;
  if (!path || path.length < min || path.length > max) continue;
  const fingerprint = rows.join('\n').replace(/[.$@]/g, ' ');
  if (seen.has(fingerprint) && selected.length > 4) continue;
  seen.add(fingerprint);
  selected.push({ rows, solutionLength: path.length, solution: path });
}
if (selected.length !== 24) throw new Error(`Only generated ${selected.length} levels`);
console.log(JSON.stringify(selected, null, 2));
