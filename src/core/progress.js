const KEY = 'sokoban-progress-v1';

export function loadProgress(storage) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return { unlocked: 1, completed: {} };
    const data = JSON.parse(raw);
    if (!Number.isInteger(data.unlocked) || data.unlocked < 1 || !data.completed || typeof data.completed !== 'object') throw new Error('Invalid progress');
    return { unlocked: Math.min(24, data.unlocked), completed: data.completed };
  } catch {
    return { unlocked: 1, completed: {} };
  }
}

export function completeLevel(storage, progress, level, moves) {
  const completed = { ...progress.completed };
  completed[level] = Math.min(completed[level] ?? Infinity, moves);
  const next = { unlocked: Math.min(24, Math.max(progress.unlocked, level + 1)), completed };
  storage.setItem(KEY, JSON.stringify(next));
  return next;
}
