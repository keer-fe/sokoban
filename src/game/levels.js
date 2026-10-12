import { mapRows } from './maps.js';
import { minimumSteps } from './minimum-steps.js';

// Group by original level number, without claiming an unverified difficulty rating.
export const difficulties = ['1–30关', '31–60关', '61–100关'];
const tiles = { 0: '_', 1: '#', 2: ' ', 3: '.', 4: '$', 5: '*', 6: '@', 7: '+' };

export const levels = mapRows.map((grid, index) => ({
  id: `selfboot-${index + 1}`,
  sourceNumber: index + 1,
  name: `推箱子 · 第 ${index + 1} 关`,
  difficulty: difficulties[index < 30 ? 0 : index < 60 ? 1 : 2],
  boxCount: grid.join('').split('').filter((cell) => cell === '4' || cell === '5').length,
  minSteps: minimumSteps[index + 1] || null,
  rows: grid.map((row) => Array.from(row, (cell) => {
    if (!(cell in tiles)) throw new Error(`Unknown source tile: ${cell}`);
    return tiles[cell];
  }).join('')),
}));
