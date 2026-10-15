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

const adventure = [
  {
    id: 'adventure-switches-1', name: '第一章 · 门前一步', tip: '踩住黄色按钮，门就会打开',
    difficulty: '教学', minSteps: 4, rows: ['########', '#@ !D$.#', '########'],
  },
  {
    id: 'adventure-switches-2', name: '第一章 · 穿门而过', tip: '离开按钮后，门会在身后关闭',
    difficulty: '教学', minSteps: 5,
    rows: ['#########', '#@ !D   #', '#   #$  #', '#   #.  #', '#   #   #', '#########'],
  },
  {
    id: 'adventure-switches-3', name: '第一章 · 箱子值守', tip: '箱子也能压住按钮，让门保持开启',
    difficulty: '简单', minSteps: 12,
    rows: ['#########', '#@$!.#  #', '#    D$.#', '#    #  #', '#    #  #', '#########'],
  },
  {
    id: 'adventure-switches-4', name: '第一章 · 一键双门', tip: '一个按钮，可以同时打开多扇门',
    difficulty: '普通', minSteps: 24,
    rows: ['##########', '#@& .#   #', '#    D $ #', '#    # . #', '#    D $ #', '#    # . #', '##########'],
  },
  {
    id: 'adventure-switches-5', name: '第一章 · 先开后收', tip: '先用箱子开门，最后再把它送到终点',
    difficulty: '普通', minSteps: 22,
    rows: ['###########', '#@$!.#    #', '#    D $  #', '#    # .  #', '#    D $  #', '#    # .  #', '###########'],
  },
  {
    id: 'adventure-switches-6', name: '第一章 · 开门营业', tip: '安排好顺序，完成按钮与门的综合挑战',
    difficulty: '挑战', minSteps: 27,
    rows: ['############', '#@ $!.#    #', '#     D $$ #', '#     # .. #', '#     D $ .#', '#     #    #', '############'],
  },
].map((level, index) => ({ ...level, campaign: 'adventure', campaignIndex: index,
  chapter: 'switches', chapterIndex: 0,
  boxCount: level.rows.join('').split('').filter(cell => '$*&'.includes(cell)).length }));

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
// Campaign IDs are persisted with future level records, so keep them stable.
export const campaigns = Object.freeze([
  { id: 'classic', name: '经典模式', description: '原汁原味的 106 关推箱子' },
  { id: 'adventure', name: '冒险模式', description: '机关章节与全新解谜规则' },
  { id: 'coop', name: '合作模式', description: '双人协作，共同破解机关' },
]);

// Keep all 100 original maps in source order after the six onboarding levels.
// Adventure levels will join this catalog with their own stable IDs and numbering.
const classic = [...onboarding, ...originals].map((level, index) => ({
  ...level, campaign: 'classic', campaignIndex: index,
  name: `经典模式 · 第 ${index + 1} 关`,
}));

export const levels = [...classic, ...adventure];
