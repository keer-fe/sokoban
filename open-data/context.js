import { PROGRESS_KEY, ProgressSync, rankFriends } from './model.js';
import { apiError, explainError, needsPrivacyDeclaration } from './errors.js';
import { createLevelBoard } from './level-board.js';
import { createFriendsPushAnimation } from './push-animation.js';

export function createOpenDataBoard(api, timers = {
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: id => clearTimeout(id),
}) {
  const canvas = api.getSharedCanvas();
  const ctx = canvas.getContext('2d');
  let width = 330, height = 468, ratio = 1, visible = false;
  let scrollY = 0, rows = [], loadState = 'loading', syncState = 'idle';
  let loadError = null;
  let generation = 0, retryTimer = null, retries = 0, paused = false;
  let loadingTimer = null, loadingTick = 0, fontFamily = 'sans-serif';
  const avatars = new Map();
  const medalSources = [
    'open-data/assets/medal-gold.png',
    'open-data/assets/medal-silver.png',
    'open-data/assets/medal-bronze.png',
  ];
  const medals = medalSources.map((source) => {
    if (typeof api.createImage !== 'function') return null;
    const entry = { image: api.createImage(), ready: false };
    entry.image.onload = () => { entry.ready = true; draw(); };
    entry.image.onerror = () => { entry.ready = false; };
    entry.image.src = source;
    return entry;
  });
  const emptyArt = typeof api.createImage === 'function' ? api.createImage() : null;
  let emptyArtReady = false;
  if (emptyArt) {
    emptyArt.onload = () => { emptyArtReady = true; draw(); };
    emptyArt.onerror = () => { emptyArtReady = false; };
    emptyArt.src = 'open-data/assets/ranking-empty-v1.png';
  }
  const loadingPush = createFriendsPushAnimation(api, draw);
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
  const levelBoard = createLevelBoard(request, canvas);
  let levelMode = false;
  function label(value, x, y, size = 15, color = '#5A321C', align = 'left', font = 'sans-serif') {
    ctx.font = `bold ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), x, y);
  }
  function bottomLabel(value, x, y, size, color, align = 'left') {
    ctx.font = `bold ${size}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
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
      width / 2, height / 2 + 17 + index * 17, 11, '#9B673E', 'center'));
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
  function roundedRect(x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function stopLoadingAnimation() {
    if (loadingTimer !== null) timers.clearTimeout(loadingTimer);
    loadingTimer = null;
  }
  function animateLoading() {
    if (!visible || loadState !== 'loading' || loadingTimer !== null) return;
    loadingTimer = timers.setTimeout(() => {
      loadingTimer = null;
      loadingTick += 1;
      draw();
    }, 90);
  }
  function drawLoading() {
    const centerX = width / 2;
    const centerY = height / 2 - 26;
    loadingPush.draw(ctx, centerX, centerY + 42, loadingTick);
    label('正在获取好友进度…', centerX, centerY + 78, 16, '#6D4327', 'center', fontFamily);
    animateLoading();
  }
  function draw() {
    if (!visible) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const rowHeight = 75;
    const viewTop = 36;
    const viewHeight = height - viewTop - 58;
    const maxScroll = Math.max(0, rows.length * rowHeight - viewHeight);
    scrollY = Math.max(0, Math.min(maxScroll, scrollY));
    if (loadState === 'loading') drawLoading();
    else if (loadState === 'error') {
      const { hint, detail } = explainError(loadError);
      label('好友榜暂时加载失败', width / 2, height / 2 - 45, 17, '#5A321C', 'center');
      label(hint, width / 2, height / 2 - 13, 12, '#8D6540', 'center');
      detailLines(detail);
    } else if (!rows.length) {
      if (emptyArtReady) ctx.drawImage(emptyArt, 20, 70, width - 40, Math.min(220, height - 150));
      label('暂无好友成绩', width / 2, Math.min(height - 92, 308), 25, '#8B3618', 'center', fontFamily);
      ctx.fillStyle = '#35CC19'; ctx.strokeStyle = '#167922'; ctx.lineWidth = 3;
      roundedRect((width - 182) / 2, height - 50, 182, 47, 17);
      ctx.fill(); ctx.stroke();
      label('邀请好友', width / 2, height - 26, 21, '#FFFFFF', 'center', fontFamily);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.rect(7, viewTop, width - 14, viewHeight);
      ctx.clip();
      rows.forEach((row, index) => {
      const y = viewTop + index * rowHeight - scrollY;
      if (y + rowHeight < viewTop || y > viewTop + viewHeight) return;
      const centerY = y + rowHeight / 2;
      ctx.fillStyle = row.isMe ? '#E0F9D7' : row.rank === 1 ? '#FFF0BC' : '#FFF8E9';
      ctx.strokeStyle = row.isMe ? '#5ED866' : '#EEC997';
      ctx.lineWidth = row.isMe ? 2 : 1;
      roundedRect(1, y + 2, width - 4, rowHeight - 5, 13);
      ctx.fill();
      roundedRect(1, y + 2, width - 4, rowHeight - 5, 13);
      ctx.stroke();
      const medal = medals[row.rank - 1];
      if (medal?.ready) ctx.drawImage(medal.image, 9, centerY - 24, 48, 48);
      else label(row.rank, 32, centerY, 23, row.isMe ? '#14662A' : '#8B3618', 'center', fontFamily);
      ctx.fillStyle = '#E2C899';
      roundedRect(67, centerY - 24, 48, 48, 11); ctx.fill();
      const img = avatar(row.avatarUrl);
      if (img) {
        ctx.save();
        roundedRect(69, centerY - 22, 44, 44, 9);
        ctx.clip();
        ctx.drawImage(img, 69, centerY - 22, 44, 44);
        ctx.restore();
      } else label(Array.from(row.nickname)[0] || '友', 91, centerY, 18, '#517E39', 'center');
      ctx.font = `bold 16px ${fontFamily}`;
      label(truncate(row.isMe ? '我' : row.nickname, 104), 130, centerY, 16,
        row.isMe ? '#14662A' : '#753015', 'left', fontFamily);
      ctx.beginPath();
      for (let point = 0; point < 10; point++) {
        const angle = -Math.PI / 2 + point * Math.PI / 5;
        const radius = point % 2 ? 6 : 12;
        const px = width - 79 + Math.cos(angle) * radius;
        const py = centerY + Math.sin(angle) * radius;
        if (point) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fillStyle = '#FFD13D'; ctx.strokeStyle = '#A94A12';
      ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
      label(row.completed, width - 15, centerY, 22, row.isMe ? '#14662A' : '#753015', 'right', fontFamily);
      });
      ctx.restore();
      if (maxScroll > 0) {
        const thumbHeight = Math.max(28, viewHeight * viewHeight / (rows.length * rowHeight));
        ctx.fillStyle = '#D8BA7D';
        ctx.fillRect(width - 6, viewTop, 3, viewHeight);
        ctx.fillStyle = '#4DA83D';
        ctx.fillRect(width - 6, viewTop + scrollY / maxScroll * (viewHeight - thumbHeight), 3, thumbHeight);
      }
    }
  }
  async function loadFriends() {
    const current = ++generation;
    loadState = 'loading';
    draw();
    try {
      const selfRequest = typeof api.getUserInfo === 'function'
        ? request('getUserInfo', { openIdList: ['selfOpenId'], lang: 'zh_CN' }).catch(() => null)
        : Promise.resolve(null);
      const [result, selfResult] = await Promise.all([
        request('getFriendCloudStorage', { keyList: [PROGRESS_KEY] }), selfRequest,
      ]);
      if (current !== generation) return;
      const self = selfResult && Array.isArray(selfResult.data) ? selfResult.data[0] : null;
      const selfId = self && (self.openId || self.openid);
      rows = rankFriends(result.data).map((row) => ({ ...row, isMe: Boolean(self && (
        (selfId && row.id === selfId)
        || (!selfId && row.nickname === self.nickName && row.avatarUrl === self.avatarUrl)
      )) }));
      scrollY = Math.min(scrollY, Math.max(0, rows.length * 75 - (height - 94)));
      loadState = 'ready';
    } catch (error) {
      if (current !== generation) return;
      rows = [];
      loadError = error;
      loadState = 'error';
    }
    stopLoadingAnimation();
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
    if (message.type === 'level-sync') {
      try { await levelBoard.sync(message.levelId, message.steps); } catch { /* Retried when the result is shown. */ }
      return;
    }
    if (message.type === 'level-show') {
      visible = false; generation++; levelMode = true;
      await levelBoard.show(message); return;
    }
    if (levelMode && message.type === 'level-refresh') { await levelBoard.refresh(); return; }
    if (levelMode && message.type === 'level-previous') { levelBoard.turn(-1); return; }
    if (levelMode && message.type === 'level-next') { levelBoard.turn(1); return; }
    if (message.type === 'show' || message.type === 'hide' || message.type === 'pause') {
      levelBoard.hide(); levelMode = false;
    }
    if (message.type === 'resize') {
      width = Math.max(300, Math.min(414, Number(message.width) || 330));
      height = Math.max(300, Math.min(700, Number(message.height) || 468));
      ratio = Math.max(1, Math.min(3, Number(message.pixelRatio) || 1));
      if (typeof message.fontFamily === 'string' && message.fontFamily) fontFamily = message.fontFamily;
      // Physical dimensions are set by the main domain before this message arrives.
      if (levelMode) levelBoard.draw(); else draw();
    } else if (message.type === 'sync') {
      paused = false;
      await sync(message.completed);
    } else if (message.type === 'show' || message.type === 'refresh') {
      visible = true; paused = false;
      scrollY = 0;
      loadState = 'loading';
      await sync(message.completed);
      if (visible) await loadFriends();
    } else if (message.type === 'hide' || message.type === 'pause') {
      visible = false;
      generation++;
      stopLoadingAnimation();
      if (message.type === 'pause') { paused = true; cancelRetry(); }
    } else if (message.type === 'scroll' && visible) {
      const delta = Number(message.delta);
      if (!Number.isFinite(delta)) return;
      scrollY = Math.max(0, Math.min(Math.max(0, rows.length * 66 - (height - 94)), scrollY + delta));
      draw();
    }
  }
  return { onMessage };
}
