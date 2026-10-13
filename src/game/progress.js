const KEY = 'sokoban.progress.v1';
const integer = (value, fallback = 0) => Number.isSafeInteger(value) && value >= 0 ? value : fallback;
export function beijingDate(time) { return new Date(time + 8 * 3600000).toISOString().slice(0, 10); }

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
    const ids = new Set(catalog.map(level => level.id));
    const unlockedIds = Array.isArray(saved.unlockedIds) ? saved.unlockedIds.filter(id => ids.has(id)) : [];
    // v1 saves used source order. Preserve every previously accessible original map.
    if (!Array.isArray(saved.unlockedIds) && Object.keys(records).some(id => id.startsWith('selfboot-'))) {
      let firstUnfinished = 1;
      while (records[`selfboot-${firstUnfinished}`]) firstUnfinished += 1;
      catalog.filter(level => level.sourceNumber && level.sourceNumber <= firstUnfinished)
        .forEach(level => unlockedIds.push(level.id));
    }
    this.state = { records, unlockedIds, cards: integer(saved.cards),
      lastSignIn: typeof saved.lastSignIn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(saved.lastSignIn) ? saved.lastSignIn : '',
      music: saved.music === true, sound: saved.sound === true, tutorialDone: saved.tutorialDone === true };
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
    const firstUnfinished = this.catalog.findIndex(({ id }) => !this.state.records[id]);
    return firstUnfinished === -1 ? this.catalog.length - 1 : firstUnfinished;
  }
  get allComplete() { return this.catalog.every(({ id }) => this.state.records[id]); }
  get completedLevels() { return this.catalog.filter(level => this.state.records[level.id]).length; }
  isUnlocked(index) {
    const level = this.catalog[index];
    return !!level && (index <= this.unlocked || !!this.state.records[level.id] || this.state.unlockedIds.includes(level.id));
  }
  finish(level, steps, stars) {
    const previous = this.state.records[level.id];
    const nextLevel = this.catalog[this.catalog.findIndex(item => item.id === level.id) + 1];
    const unlockedIds = [...new Set([...this.state.unlockedIds, level.id, ...(nextLevel ? [nextLevel.id] : [])])];
    return this.commit({ ...this.state, unlockedIds, records: { ...this.state.records, [level.id]: {
      bestSteps: Math.min(previous ? previous.bestSteps : Infinity, steps),
      stars: Math.max(previous ? previous.stars : 0, stars),
    } } });
  }
  canSignIn(time) { return beijingDate(time) > this.state.lastSignIn; }
  signIn(time) {
    return this.canSignIn(time) && this.commit({ ...this.state, cards: this.state.cards + 5, lastSignIn: beijingDate(time) });
  }
  spendCard() { return this.state.cards > 0 && this.commit({ ...this.state, cards: this.state.cards - 1 }); }
  toggle(key) {
    if (key !== 'music' && key !== 'sound') return false;
    return this.commit({ ...this.state, [key]: !this.state[key] });
  }
  finishTutorial() { return this.commit({ ...this.state, tutorialDone: true }); }
}
