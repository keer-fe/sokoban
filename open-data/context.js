import { PAGE_SIZE, PROGRESS_KEY, ProgressSync, rankFriends } from './model.js';
import { apiError, explainError, needsPrivacyDeclaration } from './errors.js';

export function createOpenDataBoard(api, timers = {
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: id => clearTimeout(id),
}) {
  const canvas = api.getSharedCanvas();
  const ctx = canvas.getContext('2d');
  let width = 366, height = 520, ratio = 1, visible = false;
  let page = 0, rows = [], loadState = 'loading', syncState = 'idle';
  let loadError = null;
  let generation = 0, retryTimer = null, retries = 0, paused = false;
  const avatars = new Map();
  function request(name, options) {
    return new Promise((resolve, reject) => {
      let finished = false;
      const timeout = timers.setTimeout(() => done(reject, new Error(`${name} timed out`)), 12000);
      function done(callback, value) {
        if (finished) return;
        finished = true;
        timers.clearTimeout(timeout);
        if (callback === reject) {
          const error = apiError(name, value);
          console.warn('[好友榜]', error.api, error.code ?? '', error.message);
          callback(error);
        } else callback(value);
      }
      try {
        if (typeof api[name] !== 'function') throw new Error(`${name} is unavailable`);
        api[name]({ ...options, success: result => done(resolve, result), fail: error => done(reject, error) });
      } catch (error) { done(reject, error); }
    });
  }
  const progress = new ProgressSync(request);
  function label(value, x, y, size = 15, color = '#263A4A', align = 'left') {
    ctx.font = `bold ${size}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), x, y);
  }
  function truncate(value, maxWidth) {
    let letters = Array.from(value);
    if (ctx.measureText(value).width <= maxWidth) return value;
    while (letters.length && ctx.measureText(`${letters.join('')}…`).width > maxWidth) letters.pop();
    return `${letters.join('')}…`;
  }
  function detailLines(value) {
    ctx.font = 'bold 11px sans-serif';
    const lines = [];
    let line = '';
    for (const letter of Array.from(value)) {
      if (ctx.measureText(line + letter).width > width - 32) { lines.push(line); line = ''; }
      line += letter;
    }
    if (line) lines.push(line);
    lines.slice(0, 4).forEach((item, index) => label(
      index === 3 && lines.length > 4 ? `${item.slice(0, -1)}…` : item,
      width / 2, height / 2 + 17 + index * 17, 11, '#AB5D27', 'center'));
  }
  function avatar(url) {
    if (!url || !/^https:\/\//.test(url) || typeof api.createImage !== 'function') return null;
    if (!avatars.has(url)) {
      const entry = { image: api.createImage(), ready: false };
      avatars.set(url, entry);
      entry.image.onload = () => { entry.ready = true; draw(); };
      entry.image.onerror = () => { entry.ready = false; };
      entry.image.src = url;
    }
    const entry = avatars.get(url);
    return entry.ready ? entry.image : null;
  }
  function draw() {
    if (!visible) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    label('排名', 16, 24, 12, '#738294');
    label('好友', 96, 24, 12, '#738294');
    label('闯关进度', width - 16, 24, 12, '#738294', 'right');
    const rowHeight = Math.min(60, (height - 138) / PAGE_SIZE);
    if (loadState === 'loading') label('正在获取好友进度…', width / 2, height / 2 - 30, 16, '#738294', 'center');
    else if (loadState === 'error') {
      const { hint, detail } = explainError(loadError);
      label('好友榜暂时加载失败', width / 2, height / 2 - 45, 17, '#263A4A', 'center');
      label(hint, width / 2, height / 2 - 13, 12, '#738294', 'center');
      detailLines(detail);
    } else if (!rows.length) {
      label('还没有好友进度', width / 2, height / 2 - 45, 18, '#263A4A', 'center');
      label('好友玩过本游戏并上传后会出现在这里', width / 2, height / 2 - 12, 12, '#738294', 'center');
    } else rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).forEach((row, index) => {
      const y = 44 + index * rowHeight;
      ctx.fillStyle = index % 2 ? '#F3F7F9' : '#FFF8DE';
      ctx.fillRect(8, y, width - 16, rowHeight - 4);
      label(row.rank, 28, y + rowHeight / 2 - 2, 18, row.rank <= 3 ? '#B06C16' : '#738294', 'center');
      ctx.fillStyle = '#D9E6DF';
      ctx.fillRect(50, y + 8, 36, 36);
      const img = avatar(row.avatarUrl);
      if (img) ctx.drawImage(img, 50, y + 8, 36, 36);
      else label(Array.from(row.nickname)[0] || '友', 68, y + 26, 18, '#507A61', 'center');
      ctx.font = 'bold 15px sans-serif';
      label(truncate(row.nickname, width - 208), 96, y + rowHeight / 2 - 2);
      label(`已通关 ${row.completed} 关`, width - 16, y + rowHeight / 2 - 2, 13, '#258448', 'right');
    });
    if (loadState === 'ready' && rows.length) {
      label(`${page + 1} / ${Math.ceil(rows.length / PAGE_SIZE)} 页 · 同进度并列`, width / 2, height - 78, 12, '#738294', 'center');
    }
    ctx.fillStyle = '#E8F3E9';
    ctx.fillRect(8, height - 58, width - 16, 50);
    const count = Math.max(progress.target, progress.confirmed || 0);
    label(`我的最高进度：已通关 ${count} 关`, 20, height - 39, 14, '#258448');
    const status = { idle: '等待同步', loading: '正在同步进度…', ready: '进度已同步',
      privacy: '进度待同步 · 需先完成后台隐私声明', error: '进度待同步 · 联网后刷新重试' }[syncState];
    label(status, 20, height - 19, 11, syncState === 'error' ? '#AB5D27' : '#738294');
  }
  async function loadFriends() {
    const current = ++generation;
    loadState = 'loading';
    draw();
    try {
      const result = await request('getFriendCloudStorage', { keyList: [PROGRESS_KEY] });
      if (current !== generation) return;
      rows = rankFriends(result.data);
      page = Math.min(page, Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1));
      loadState = 'ready';
    } catch (error) {
      if (current !== generation) return;
      rows = [];
      loadError = error;
      loadState = 'error';
    }
    draw();
  }
  function cancelRetry() {
    if (retryTimer !== null) timers.clearTimeout(retryTimer);
    retryTimer = null;
  }
  async function sync(completed, manual = true) {
    if (manual) { retries = 0; cancelRetry(); }
    syncState = 'loading';
    draw();
    try {
      await progress.sync(completed);
      syncState = 'ready';
      cancelRetry();
    } catch (error) {
      syncState = needsPrivacyDeclaration(error) ? 'privacy' : 'error';
      if (syncState !== 'privacy' && !paused && retryTimer === null && retries < 2) {
        const delay = [2000, 10000][retries++];
        retryTimer = timers.setTimeout(() => {
          retryTimer = null;
          sync(progress.target, false).then(() => { if (visible) loadFriends(); });
        }, delay);
      }
    }
    draw();
  }
  async function onMessage(message) {
    if (!message || message.channel !== 'sokoban.friends.v1') return;
    if (message.type === 'resize') {
      width = Math.max(300, Math.min(414, Number(message.width) || 366));
      height = Math.max(430, Math.min(700, Number(message.height) || 520));
      ratio = Math.max(1, Math.min(3, Number(message.pixelRatio) || 1));
      // Physical dimensions are set by the main domain before this message arrives.
      draw();
    } else if (message.type === 'sync') {
      paused = false;
      await sync(message.completed);
    } else if (message.type === 'show' || message.type === 'refresh') {
      visible = true; paused = false;
      page = 0;
      loadState = 'loading';
      await sync(message.completed);
      if (visible) await loadFriends();
    } else if (message.type === 'hide' || message.type === 'pause') {
      visible = false;
      generation++;
      if (message.type === 'pause') { paused = true; cancelRetry(); }
    } else if (message.type === 'previous' || message.type === 'next') {
      page = Math.max(0, Math.min(Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1),
        page + (message.type === 'next' ? 1 : -1)));
      draw();
    }
  }
  return { onMessage };
}
