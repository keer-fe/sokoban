// Original small maps for exercising the UI flow. This is not the final release catalog.
export const levels = [
  { id: 'intro-1', name: '初次搬运', difficulty: '简单', minSteps: 5,
    rows: ['#######', '# . . #', '# $ $ #', '# @   #', '#######'] },
  { id: 'intro-2', name: '并肩前进', difficulty: '简单', minSteps: 10,
    rows: ['#######', '#  .. #', '# $$  #', '#  @  #', '#     #', '#######'] },
  { id: 'intro-3', name: '绕个小弯', difficulty: '中等', minSteps: 9,
    rows: ['#######', '# . . #', '#     #', '# $#$ #', '#  @  #', '#     #', '#######'] },
  { id: 'intro-4', name: '错位搬运', difficulty: '中等', minSteps: 10,
    rows: ['########', '#      #', '# .  . #', '# $  $ #', '#  ##  #', '#  @   #', '########'] },
  { id: 'intro-5', name: '三箱同行', difficulty: '困难', minSteps: 16,
    rows: ['########', '# . . .#', '#      #', '# $ $ $#', '#   @  #', '#      #', '########'] },
  { id: 'intro-6', name: '各就各位', difficulty: '困难', minSteps: 15,
    rows: ['########', '#      #', '# . .. #', '#      #', '# $$ $ #', '#   @  #', '########'] },
];

export const difficulties = ['简单', '中等', '困难'];
