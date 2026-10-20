const KEY = 'sokoban.progress.v1';
const integer = (value, fallback = 0) => Number.isSafeInteger(value) && value >= 0 ? value : fallback;
export class ProgressStore {
  constructor(platform, catalog) {
    this.platform = platform;
    this.catalog = catalog;
    let saved;
    try { saved = platform.readStorage ? platform.readStorage(KEY) : null; } catch { saved = null; }
    saved = saved && typeof saved === 'object' ? saved : {};
    const records = {};
    // Retain valid records for temporarily unpublished maps as well.
    const recordIds = new Set([...catalog.map(level => level.id), ...Object.keys(saved.records || {})]);
    recordIds.forEach(id => {
      const record = saved.records && saved.records[id];
      if (record && integer(record.bestSteps) > 0 && Number.isInteger(record.stars) && record.stars >= 0 && record.stars <= 3) {
        records[id] = { stars: record.stars, bestSteps: record.bestSteps };
      }
    });
    // Existing classic players have already learned the basic controls.
    // Preserve their unlocked path when the new learning map is inserted first.
    if (catalog.some(level => level.id === 'classic-learn-1')
      && !records['classic-learn-1']
      && Object.keys(records).some(id => id.startsWith('selfboot-'))) {
      records['classic-learn-1'] = { stars: 3, bestSteps: 4 };
    }
    const ids = new Set(catalog.map(level => level.id));
    const unlockedIds = Array.isArray(saved.unlockedIds) ? saved.unlockedIds.filter(id => ids.has(id)) : [];
    // v1 saves used source order. Preserve every previously accessible original map.
    if (!Array.isArray(saved.unlockedIds) && Object.keys(records).some(id => id.startsWith('selfboot-'))) {
      let firstUnfinished = 1;
      while (records[`selfboot-${firstUnfinished}`]) firstUnfinished += 1;
      catalog.filter(level => level.sourceNumber && level.sourceNumber <= firstUnfinished)
        .forEach(level => unlockedIds.push(level.id));
    }
    const solutions = {};
    for (const level of catalog) {
      const solution = saved.solutions?.[level.id];
      if (solution && solution.map === level.rows.join('\n') && Array.isArray(solution.moves)
        && solution.moves.length > 0 && solution.moves.length <= 100000
        && solution.moves.every(move => ['up', 'down', 'left', 'right'].includes(move))) {
        solutions[level.id] = { map: solution.map, moves: [...solution.moves] };
      }
    }
    this.state = { records, unlockedIds, solutions, cards: integer(saved.cards),
      music: saved.music !== false, sound: saved.sound !== false,
      vibration: false, tutorialDone: saved.tutorialDone === true };
  }
  commit(next) {
    try {
      if (this.platform.writeStorage) this.platform.writeStorage(KEY, next);
      this.state = next;
      return true;
    } catch {
      this.platform.notify('保存失败，请检查设备存储空间');
      return false;
    }
  }
  get unlocked() {
    const classic = this.catalog.map((level, index) => ({ level, index }))
      .filter(({ level }) => (level.campaign || 'classic') === 'classic');
    const firstUnfinished = classic.findIndex(({ level }) => !this.state.records[level.id]);
    return firstUnfinished === -1 ? classic.at(-1)?.index ?? 0 : classic[firstUnfinished].index;
  }
  get allComplete() { return this.catalog.every(({ id }) => this.state.records[id]); }
  get completedLevels() { return this.catalog.filter(level => this.state.records[level.id]).length; }
  get totalStars() {
    return this.catalog.reduce((total, level) => total + (this.state.records[level.id]?.stars || 0), 0);
  }
  isUnlocked(index) {
    const level = this.catalog[index];
    if (!level) return false;
    const campaign = level.campaign || 'classic';
    const campaignLevels = this.catalog.filter(item => (item.campaign || 'classic') === campaign);
    const position = campaignLevels.findIndex(item => item.id === level.id);
    const firstUnfinished = campaignLevels.findIndex(item => !this.state.records[item.id]);
    const frontier = firstUnfinished === -1 ? campaignLevels.length - 1 : firstUnfinished;
    return position <= frontier || !!this.state.records[level.id] || this.state.unlockedIds.includes(level.id);
  }
  finish(level, steps, stars, moves) {
    const previous = this.state.records[level.id];
    const campaign = level.campaign || 'classic';
    const campaignLevels = this.catalog.filter(item => (item.campaign || 'classic') === campaign);
    const nextLevel = campaignLevels[campaignLevels.findIndex(item => item.id === level.id) + 1];
    const unlockedIds = [...new Set([...this.state.unlockedIds, level.id, ...(nextLevel ? [nextLevel.id] : [])])];
    const solutions = { ...this.state.solutions };
    const existing = solutions[level.id];
    if (Array.isArray(moves) && moves.length === steps && moves.length <= 100000
      && moves.every(move => ['up', 'down', 'left', 'right'].includes(move))
      && (!existing || moves.length < existing.moves.length)) {
      solutions[level.id] = { map: level.rows.join('\n'), moves: [...moves] };
    }
    return this.commit({ ...this.state, unlockedIds, solutions, records: { ...this.state.records, [level.id]: {
      bestSteps: Math.min(previous ? previous.bestSteps : Infinity, steps),
      stars: Math.max(previous ? previous.stars : 0, stars),
    } } });
  }
  spendCard() { return this.state.cards > 0 && this.commit({ ...this.state, cards: this.state.cards - 1 }); }
  toggle(key) {
    if (!['music', 'sound', 'vibration'].includes(key)) return false;
    return this.commit({ ...this.state, [key]: !this.state[key] });
  }
  finishTutorial() { return this.commit({ ...this.state, tutorialDone: true }); }
}
