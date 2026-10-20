import { readFileSync, writeFileSync } from 'node:fs';
import { parseLevel, GameSession, directions as movementVectors } from '../src/game/engine.js';
import { solve as solveAdvanced } from './solve-advanced-v2.js';
import { solve as solveBfs } from './solve-levels.js';

const root = new URL('../docs/level-research/', import.meta.url);
const catalog = readFileSync(new URL('catalog.csv', root), 'utf8');
const candidateFile = process.argv[2] || 'launch-100-candidates.csv';
const outputFile = process.argv[3] || 'launch-100-verification.json';
const shortlist = readFileSync(new URL(candidateFile, root), 'utf8');

function csvRows(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(Boolean)) rows.push(row);
      row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [header, ...data] = rows;
  return data.map(values => Object.fromEntries(header.map((key, i) => [key, values[i] ?? ''])));
}

const all = csvRows(catalog);
const selected = csvRows(shortlist);
const byKey = new Map(all.map(row => [`${row.source}\u0000${row.source_no}`, row]));
const results = [];

for (const candidate of selected) {
  const original = byKey.get(`${candidate.source}\u0000${candidate.source_no}`);
  if (!original) throw new Error(`Missing map: ${candidate.source} ${candidate.source_no}`);
  const level = { id: candidate.id || `microban-${candidate.source_no}`,
    rows: JSON.parse(original.rows) };
  const board = parseLevel(level);
  const expected = Number(candidate.min_steps) || null;
  const result = { candidate_no: Number(candidate.candidate_no), source: candidate.source,
    source_no: Number(candidate.source_no), id: level.id, boxes: board.boxes.length,
    size: `${board.width}×${board.height}`, status: '', steps: expected, method: '', ms: 0 };
  const started = Date.now();
  try {
    let path;
    if (candidate.source === '本地经典' && expected) {
      path = solveBfs(level, { maxStates: 2_000_000, maxMs: 20_000 });
      if (path.length !== expected) throw new Error(`Expected ${expected} steps, got ${path.length}`);
      result.method = 'BFS shortest';
    } else {
      path = solveAdvanced(level, { maxStates: 250_000, maxMs: 2500, maxOpen: 150_000 });
      result.method = 'push A*';
    }
    const directionMap = { U: 'up', D: 'down', L: 'left', R: 'right' };
    const directions = Array.isArray(path) ? path
      : typeof path === 'string' ? [...path].map(char => directionMap[char])
      : path?.path || path?.moves;
    if (!Array.isArray(directions)) throw new Error(`Unexpected solver result: ${typeof path}`);
    const session = new GameSession(level);
    let pushes = 0, boxSwitches = 0, directionChanges = 0, goalExits = 0;
    let lastPushedBox = -1;
    const lastDirectionByBox = new Map();
    for (const direction of directions) {
      const [dx, dy] = movementVectors[direction];
      const target = session.state.player + dy * board.width + dx;
      const boxIndex = session.state.boxes.indexOf(target);
      if (boxIndex >= 0) {
        pushes++;
        if (lastPushedBox >= 0 && lastPushedBox !== boxIndex) boxSwitches++;
        if (lastDirectionByBox.has(boxIndex) && lastDirectionByBox.get(boxIndex) !== direction) directionChanges++;
        if (board.goals.has(target)) goalExits++;
        lastPushedBox = boxIndex;
        lastDirectionByBox.set(boxIndex, direction);
      }
      if (!session.move(direction)) throw new Error(`Replay rejected ${direction}`);
    }
    if (!session.complete) throw new Error('Replay did not complete');
    result.status = 'verified';
    result.steps = directions.length;
    Object.assign(result, { pushes, boxSwitches, directionChanges, goalExits });
  } catch (error) {
    result.status = 'pending';
    result.reason = error.message;
  }
  result.ms = Date.now() - started;
  results.push(result);
  console.log(JSON.stringify(result));
}

const summary = {
  total: results.length, verified: results.filter(row => row.status === 'verified').length,
  pending: results.filter(row => row.status === 'pending').length,
  results,
};
writeFileSync(new URL(outputFile, root), JSON.stringify(summary, null, 2) + '\n');
