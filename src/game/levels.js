import { mapRows } from './maps.js';
import { minimumSteps } from './minimum-steps.js';

const tiles = { 0: '_', 1: '#', 2: ' ', 3: '.', 4: '$', 5: '*', 6: '@', 7: '+' };

// Original onboarding maps; shortest move counts verified by the BFS solver.
const onboarding = [
  { minSteps: 1, rows: ['######', '#@$. #', '######'] },
  { minSteps: 3, rows: ['#######', '#@ $ .#', '#######'] },
  { minSteps: 3, rows: ['#####', '# . #', '# $@#', '#   #', '#####'] },
  { minSteps: 4, rows: ['######', '#  . #', '# $  #', '# @  #', '######'] },
  { minSteps: 5, rows: ['#######', '# . . #', '# $ $ #', '# @   #', '#######'] },
  { minSteps: 8, rows: ['#######', '# . . #', '#     #', '# $ $ #', '# @   #', '#######'] },
].map((level, index) => ({ ...level, id: `onboarding-${index + 1}`, difficulty: '简单',
  boxCount: level.rows.join('').split('$').length - 1 }));

const originals = mapRows.map((grid, index) => ({
  id: `selfboot-${index + 1}`,
  sourceNumber: index + 1,
  boxCount: grid.join('').split('').filter((cell) => cell === '4' || cell === '5').length,
  minSteps: minimumSteps[index + 1] || null,
  rows: grid.map((row) => Array.from(row, (cell) => {
    if (!(cell in tiles)) throw new Error(`Unknown source tile: ${cell}`);
    return tiles[cell];
  }).join('')),
}));

// Estimates, not playtest ratings: unknown solutions are never labelled easy.
// Box count, board size and solution length contribute to the estimated label.
function difficultyScore(level) {
  const floorCount = level.rows.join('').split('').filter(cell => ' .$@*+'.includes(cell)).length;
  return level.boxCount * 8 + floorCount * 0.3 + (level.minSteps ?? 150);
}
originals.forEach(level => {
  const value = difficultyScore(level);
  level.difficulty = level.minSteps && level.boxCount <= 3 && value <= 65 ? '简单'
    : level.minSteps && level.boxCount <= 6 && value <= 130 ? '普通' : '困难';
});
// Keep all 100 original maps in source order after the six onboarding levels.
export const levels = [...onboarding, ...originals].map((level, index) => ({
  ...level, name: `推箱子 · 第 ${index + 1} 关`,
}));
