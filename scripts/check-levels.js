import { readFileSync } from 'node:fs';
import { solveLevel } from '../src/core/solver.js';

const levels = JSON.parse(readFileSync(new URL('../src/core/levels.json', import.meta.url)));
if (levels.length !== 24) throw new Error(`Expected 24 levels, got ${levels.length}`);
levels.forEach(({ rows, solutionLength }, index) => {
  const solution = solveLevel(rows);
  if (!solution || solution.length !== solutionLength) throw new Error(`Level ${index + 1} failed verification`);
});
console.log(`Verified ${levels.length} solvable levels`);
