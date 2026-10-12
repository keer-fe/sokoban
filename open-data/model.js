// Changing the map catalog/order requires a new key. Keep this inside the subdomain.
export const PROGRESS_KEY = 'sokoban.selfboot100.completed.v1';
export const PAGE_SIZE = 6;
export function validProgress(value) {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}
export function readProgress(list) {
  const entry = (Array.isArray(list) ? list : []).find(item => item.key === PROGRESS_KEY);
  if (!entry) return null;
  try {
    const value = JSON.parse(entry.value);
    return validProgress(value.completed) ? value.completed : null;
  } catch { return null; }
}
export function rankFriends(data) {
  const unique = new Map();
  (Array.isArray(data) ? data : []).forEach(user => {
    const completed = readProgress(user.KVDataList);
    if (completed === null || typeof user.openid !== 'string' || !user.openid) return;
    const row = { id: user.openid, completed, nickname: String(user.nickname || '微信好友'),
      avatarUrl: typeof user.avatarUrl === 'string' ? user.avatarUrl : '' };
    if (!unique.has(row.id) || unique.get(row.id).completed < completed) unique.set(row.id, row);
  });
  const rows = [...unique.values()].sort((a, b) => b.completed - a.completed || a.id.localeCompare(b.id));
  let rank = 0;
  return rows.map((row, index) => {
    if (!index || row.completed !== rows[index - 1].completed) rank = index + 1;
    return { ...row, rank };
  });
}

// Serialize writes and re-read cloud progress before each write. A failed read must never write.
export class ProgressSync {
  constructor(request) {
    this.request = request;
    this.target = 0;
    this.confirmed = null;
    this.pending = null;
  }
  sync(completed) {
    if (validProgress(completed)) this.target = Math.max(this.target, completed);
    if (this.pending) return this.pending;
    this.pending = this.flush().finally(() => { this.pending = null; });
    return this.pending;
  }
  async flush() {
    do {
      const result = await this.request('getUserCloudStorage', { keyList: [PROGRESS_KEY] });
      const remote = readProgress(result.KVDataList);
      const value = Math.max(remote || 0, this.confirmed || 0, this.target);
      if (remote === null || value > remote) {
        await this.request('setUserCloudStorage', { KVDataList: [{ key: PROGRESS_KEY,
          value: JSON.stringify({ completed: value }) }] });
      }
      this.confirmed = value;
    } while (this.target > this.confirmed);
    return this.confirmed;
  }
}
