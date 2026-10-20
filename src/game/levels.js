import { mapRows } from './maps.js';
import { minimumSteps } from './minimum-steps.js';

const tiles = { 0: '_', 1: '#', 2: ' ', 3: '.', 4: '$', 5: '*', 6: '@', 7: '+' };

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

// Chapter two: pressure plates and keyed doors.
// Each layout is BFS-verified via tools/design-mechanism-levels.mjs.
const weightsChapter = [
  {
    id: 'adventure-weights-1', name: '第二章 · 一推开门', tip: '按钮正好在推箱的路上，一步同时开门又送箱',
    difficulty: '教学', minSteps: 5,
    rows: ['#########', '#@ !D$ .#', '#########'],
  },
  {
    id: 'adventure-weights-2', name: '第二章 · 过门取物', tip: '踩住按钮再穿门，门后的箱子才能被推走',
    difficulty: '教学', minSteps: 6,
    rows: ['##########', '#@   !D$.#', '##########'],
  },
  {
    id: 'adventure-weights-3', name: '第二章 · 请君入室', tip: '先把一个箱子压在按钮上，再去推另一个',
    difficulty: '普通', minSteps: 15,
    rows: ['#########', '#@ $ .  #', '# ##D## #', '#  #!#  #', '# ##### #', '#   $  .#', '#########'],
  },
  {
    id: 'adventure-weights-4', name: '第二章 · 绕门归位', tip: '箱子不进门，兜一圈走到终点',
    difficulty: '普通', minSteps: 21,
    rows: ['##########', '#@ $ ! . #', '##### ####', '#   D    #', '#   $   .#', '##########'],
  },
  {
    id: 'adventure-weights-5', name: '第二章 · 双箱同守', tip: '两个箱子分别压住按钮才能保持通道',
    difficulty: '挑战', minSteps: 22,
    rows: ['##########', '#@ $ !D .#', '# ########', '# $     .#', '##########'],
  },
  {
    id: 'adventure-weights-6', name: '第二章 · 让位之礼', tip: '让新来的箱子接管按钮，再把原来的箱子送到终点',
    difficulty: '挑战', minSteps: 13,
    rows: ['##########', '#@ $ D  .#', '##### ####', '#.  &    #', '##########'],
  },
].map((level, index) => ({ ...level, campaign: 'adventure',
  chapter: 'weights', chapterIndex: 1,
  boxCount: level.rows.join('').split('').filter(cell => '$*&'.includes(cell)).length }));

// Append chapter two after chapter one and renumber campaignIndex globally.
const adventureAll = [...adventure, ...weightsChapter]
  .map((level, index) => ({ ...level, campaignIndex: index }));

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
  { id: 'classic', name: '经典模式', description: '从学习关开始的 100 关推箱子' },
  { id: 'adventure', name: '冒险模式', description: '机关章节与全新解谜规则' },
  { id: 'coop', name: '合作模式', description: '双人协作，共同破解机关' },
]);

// A single-box first map teaches walking and pushing before original puzzles begin.
// The oversized original #100 remains in the research catalog, outside the 100-level launch track.
const classicIntro = {
  id: 'classic-learn-1', campaign: 'classic', campaignIndex: 0,
  name: '经典模式 · 第 1 关', tip: '向右走两步，再把箱子向右推两次',
  difficulty: '教学', boxCount: 1, minSteps: 4,
  rows: ['########', '#@  $ .#', '########'],
};
const classic = [classicIntro, ...originals.slice(0, 99).map((level, index) => ({
  ...level, campaign: 'classic',
  name: `经典模式 · 第 ${index + 2} 关`,
  campaignIndex: index + 1,
}))];

export const levels = [...classic, ...adventureAll];
