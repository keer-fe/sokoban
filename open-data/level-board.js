export function levelKey(id) {
  return /^(selfboot|onboarding)-[1-9]\d*$/.test(id || '') ? `sokoban.steps.${id}.v1` : null;
}
export function readSteps(list, key) {
  try {
    const value = JSON.parse((list || []).find(item => item.key === key)?.value).steps;
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  } catch { return null; }
}
export function rankLevelFriends(data, key) {
  const unique = new Map();
  for (const user of Array.isArray(data) ? data : []) {
    const steps = readSteps(user.KVDataList, key);
    if (!steps || typeof user.openid !== 'string' || !user.openid) continue;
    if (!unique.has(user.openid) || steps < unique.get(user.openid).steps) {
      unique.set(user.openid, { id: user.openid, nickname: String(user.nickname || '微信好友'), steps });
    }
  }
  const rows = [...unique.values()].sort((a, b) => a.steps - b.steps || a.id.localeCompare(b.id));
  return rows.map((row, index) => ({ ...row,
    rank: rows.findIndex(other => other.steps === row.steps) + 1 }));
}

export function createLevelBoard(request, canvas) {
  let generation = 0;
  let visible = false;
  let message = null;
  let rows = [], page = 0, status = '正在加载好友成绩…';
  const pending = new Map();
  function sync(id, steps) {
    const key = levelKey(id);
    if (!key || !Number.isSafeInteger(steps) || steps <= 0) return Promise.resolve();
    const job = (pending.get(key) || Promise.resolve()).catch(() => {}).then(async () => {
      const remote = await request('getUserCloudStorage', { keyList: [key] });
      const previous = readSteps(remote.KVDataList, key);
      if (previous === null || steps < previous) await request('setUserCloudStorage', {
        KVDataList: [{ key, value: JSON.stringify({ steps }) }],
      });
    });
    pending.set(key, job);
    return job.finally(() => { if (pending.get(key) === job) pending.delete(key); });
  }
  function draw() {
    if (!visible) return;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(canvas.width / 300, 0, 0, canvas.height / 180, 0, 0);
    ctx.clearRect(0, 0, 300, 180);
    ctx.textBaseline = 'middle';
    const label = (value, x, y, size = 13, align = 'left') => {
      ctx.font = `bold ${size}px sans-serif`; ctx.fillStyle = '#263A4A'; ctx.textAlign = align;
      ctx.fillText(value, x, y);
    };
    label('好友最佳步数 · 越少越靠前', 150, 17, 13, 'center');
    rows.slice(page * 3, page * 3 + 3).forEach((row, i) => {
      label(String(row.rank), 12, 49 + i * 34);
      label(Array.from(row.nickname).slice(0, 8).join(''), 43, 49 + i * 34);
      label(`${row.steps} 步`, 286, 49 + i * 34, 13, 'right');
    });
    if (!rows.length) label(status, 150, 85, 12, 'center');
    else label(`${page + 1}/${Math.ceil(rows.length / 3)} 页 · 同步数并列`, 150, 145, 11, 'center');
    if (rows.length) label(status, 150, 166, 10, 'center');
  }
  async function show(value) {
    message = value; visible = true; page = 0; rows = []; status = '正在加载好友成绩…';
    const current = ++generation;
    draw();
    let syncFailed = false;
    try { await sync(value.levelId, value.steps); } catch { syncFailed = true; }
    if (current !== generation) return;
    try {
      const key = levelKey(value.levelId);
      if (!key) throw new Error('Invalid level');
      const result = await request('getFriendCloudStorage', { keyList: [key] });
      if (current !== generation) return;
      rows = rankLevelFriends(result.data, key);
      status = syncFailed ? '成绩待同步，点击刷新重试' : rows.length ? '仅展示已上传本关成绩的好友' : '暂无好友上传本关成绩';
    } catch {
      if (current !== generation) return;
      status = '好友榜加载失败，点击刷新重试';
    }
    draw();
  }
  return { sync, show, draw,
    hide() { visible = false; generation++; },
    refresh() { return message ? show(message) : Promise.resolve(); },
    turn(delta) { page = Math.max(0, Math.min(Math.ceil(rows.length / 3) - 1, page + delta)); draw(); },
  };
}
