import { campaigns, levels } from './levels.js';
import { pkBank } from './pk-bank.js';
import { GameSession, directions, score } from './engine.js';
import { ProgressStore } from './progress.js';

export class GameController {
  constructor(platform, catalog = levels, pkCatalog = pkBank) {
    this.platform = platform;
    this.levels = catalog;
    this.pkBank = pkCatalog;
    this.pkDrawCount = 0;
    this.progress = new ProgressStore(platform, catalog);
    this.route = 'home';
    this.modal = platform.canRequestPlayerProfile && !platform.readPlayerProfile?.() ? 'profile' : null;
    this.settingsReturn = null;
    this.friendsTab = 'friends';
    this.worldBoard = { state: 'idle', rows: [], error: null };
    this.levelCampaign = 'classic';
    this.levelView = 'campaigns';
    this.listPage = 0;
    this.levelIndex = 0;
    this.game = null;
    this.result = null;
    this.zoom = false;
    this.replay = null;
    this.pk = null;
  }
  startReplay(moves) {
    if (!Array.isArray(moves) || !moves.length) return;
    const game = new GameSession(this.game.level);
    for (const move of moves) {
      if (!game.move(move)) { this.platform.notify('解法记录无法回放，请重新通关录制'); return; }
    }
    if (!game.complete) { this.platform.notify('解法记录不完整，请重新通关录制'); return; }
    game.restart();
    this.replay = { original: this.game, modal: this.modal, moves: [...moves], playing: false, elapsed: 0 };
    this.game = game;
    this.modal = null;
  }
  advanceReplay(delta) {
    if (!this.replay?.playing) return;
    this.replay.elapsed += Math.max(0, Math.min(delta, 1000));
    if (this.replay.elapsed >= 400) {
      this.replay.elapsed = 0;
      this.game.move(this.replay.moves[this.game.state.steps]);
      if (this.game.complete) this.replay.playing = false;
    }
  }
  handleReplay(action) {
    const replay = this.replay;
    if (action === 'replay-exit') {
      this.game = replay.original; this.modal = replay.modal; this.replay = null;
    } else if (action === 'replay-play') {
      if (this.game.complete) this.game.restart();
      replay.playing = !replay.playing; replay.elapsed = 0;
    } else if (action === 'replay-back' || action === 'replay-forward' || action === 'replay-reset') {
      replay.playing = false; replay.elapsed = 0;
      if (action === 'replay-back') this.game.undo();
      if (action === 'replay-forward') this.game.move(replay.moves[this.game.state.steps]);
      if (action === 'replay-reset') this.game.restart();
    } else if (action === 'zoom') this.zoom = !this.zoom;
  }
  now() { return this.platform.wallNow ? this.platform.wallNow() : Date.now(); }
  startPk(mode = 'pk') {
    this.pk = null;
    this.roomMode = mode;
    this.modal = 'pk-choice';
  }
  pkLevel(mode = 'pk') {
    if (mode === 'pk' && this.pkBank.length) {
      const index = (Math.abs(Math.floor(this.now() / 1000)) + this.pkDrawCount++) % this.pkBank.length;
      return { level: this.pkBank[index], index: -1 };
    }
    const candidates = this.campaignEntries('classic').slice(1, 6);
    return candidates[Math.abs(Math.floor(this.now() / 1000)) % candidates.length] || null;
  }
  async createPkRoom(mode = this.roomMode || 'pk') {
    if (!this.platform.pkRooms?.available) { this.platform.notify('微信云函数不可用'); return; }
    const selected = this.pkLevel(mode);
    if (!selected) return;
    this.modal = 'pk-loading';
    try {
      const profile = this.platform.readPlayerProfile?.() || {};
      const { room } = await this.platform.pkRooms.create(selected.level.id, profile, mode);
      this.enterPkRoom(room);
    } catch (error) {
      console.warn('Create PK room failed.', error);
      this.pk = null; this.modal = 'pk-choice';
      this.platform.notify(error?.message ? `创建失败：${error.message}`.slice(0, 24) : '创建房间失败，请重试');
    }
  }
  async promptJoinPkRoom() {
    const mode = this.roomMode || 'pk';
    const code = await this.platform.pkRooms?.promptCode?.(mode);
    if (code) this.joinPkRoom(code, mode);
  }
  async joinPkRoom(code, mode = this.roomMode || 'pk') {
    if (!this.platform.pkRooms?.available || !code) return;
    this.modal = 'pk-loading';
    try {
      const profile = this.platform.readPlayerProfile?.() || {};
      const { room } = await this.platform.pkRooms.join(code, profile);
      if ((room.mode || 'pk') !== mode) throw new Error('ROOM_MODE_MISMATCH');
      this.enterPkRoom(room);
    } catch (error) {
      console.warn('Join PK room failed.', error);
      this.pk = null; this.modal = 'pk-choice'; this.platform.notify('房间不存在、已满或已过期');
    }
  }
  enterPkRoom(room) {
    const levelIndex = this.levels.findIndex(level => level.id === room.levelId);
    const level = levelIndex >= 0 ? this.levels[levelIndex]
      : this.pkBank.find(entry => entry.id === room.levelId);
    if (!level) { this.platform.notify('双方版本不一致，请更新小游戏'); return; }
    this.roomMode = room.mode || 'pk';
    this.pk = { room, level, levelIndex, pollElapsed: 0, submitting: false, moving: false,
      appliedMoves: 0, startedAt: null };
    this.levelIndex = levelIndex;
    this.levelCampaign = 'pk';
    this.game = new GameSession(level);
    this.route = 'game';
    this.platform.pkRooms.setSharedRoom(room.code, this.roomMode);
    this.applyPkRoom(room);
    this.result = null;
    this.zoom = false;
  }
  applyPkRoom(room) {
    if (!this.pk) return;
    const wasPlaying = this.pk.room?.status === 'playing';
    this.pk.room = room;
    if (Number.isFinite(room.serverNow)) this.pk.serverOffset = room.serverNow - this.now();
    if (room.status === 'waiting') this.modal = 'pk-room';
    else if (room.status === 'countdown') this.modal = 'pk-countdown';
    else if (room.status === 'cancelled') { this.modal = 'pk-cancelled'; this.pk.startedAt = null; }
    else if (room.status === 'finished') {
      if ((room.mode || 'pk') === 'coop') this.applyCoopMoves(room.moves || []);
      this.modal = 'pk-result'; this.pk.startedAt = null;
    }
    else if (room.me?.finished) { this.modal = 'pk-finished'; this.pk.startedAt = null; }
    else if (room.status === 'playing') {
      if (!wasPlaying || !this.pk.startedAt) {
        this.game = new GameSession(this.pk.level);
        this.pk.appliedMoves = 0;
        this.pk.startedAt = room.startAt - (this.pk.serverOffset || 0);
      }
      if ((room.mode || 'pk') === 'coop') this.applyCoopMoves(room.moves || []);
      this.modal = null;
    }
  }
  applyCoopMoves(moves) {
    if (!this.pk || (this.pk.room.mode || 'pk') !== 'coop') return;
    if (moves.length < this.pk.appliedMoves) {
      this.game = new GameSession(this.pk.level);
      this.pk.appliedMoves = 0;
    }
    while (this.pk.appliedMoves < moves.length) {
      this.game.move(moves[this.pk.appliedMoves]);
      this.pk.appliedMoves += 1;
    }
  }
  async moveCoop(direction) {
    if (!this.pk || this.pk.moving || this.pk.room.status !== 'playing') return;
    this.pk.moving = true;
    try {
      const { room } = await this.platform.pkRooms.move(this.pk.room.code, direction);
      this.applyPkRoom(room);
      if (this.game.complete && this.pk.room.status === 'playing') {
        const completed = await this.platform.pkRooms.complete(this.pk.room.code);
        this.applyPkRoom(completed.room);
      }
    } catch (error) {
      console.warn('Co-op move failed.', error);
      this.platform.notify('操作同步失败，请重试');
      this.refreshPkRoom();
    } finally { if (this.pk) this.pk.moving = false; }
  }
  pkElapsedMs() {
    return this.pk?.startedAt === null || this.pk?.startedAt === undefined
      ? 0 : Math.max(0, this.now() - this.pk.startedAt);
  }
  async refreshPkRoom() {
    if (!this.pk || this.pk.refreshing) return;
    this.pk.refreshing = true;
    try {
      const { room } = await this.platform.pkRooms.get(this.pk.room.code);
      this.applyPkRoom(room);
    } catch (error) { console.warn('Refresh PK room failed.', error); }
    finally { if (this.pk) this.pk.refreshing = false; }
  }
  async setPkReady() {
    if (!this.pk || this.pk.updatingReady) return;
    this.pk.updatingReady = true;
    try {
      const { room } = await this.platform.pkRooms.ready(this.pk.room.code, !this.pk.room.me.ready);
      this.applyPkRoom(room);
    } catch (error) { console.warn('Update PK ready state failed.', error); this.platform.notify('准备状态更新失败'); }
    finally { if (this.pk) this.pk.updatingReady = false; }
  }
  async startPkMatch() {
    if (!this.pk || this.pk.starting) return;
    this.pk.starting = true;
    try {
      const { room } = await this.platform.pkRooms.start(this.pk.room.code);
      this.applyPkRoom(room);
    } catch (error) { console.warn('Start PK match failed.', error); this.platform.notify('请等待双方准备'); }
    finally { if (this.pk) this.pk.starting = false; }
  }
  advancePk(delta) {
    if (!this.pk || this.pk.room.status === 'finished' || this.pk.room.status === 'cancelled') return;
    if (this.pk.room.status === 'countdown') {
      const serverNow = this.now() + (this.pk.serverOffset || 0);
      if (serverNow >= this.pk.room.startAt) this.applyPkRoom({ ...this.pk.room, status: 'playing' });
    }
    this.pk.pollElapsed += Math.max(0, delta);
    if (this.pk.pollElapsed >= 1500) { this.pk.pollElapsed = 0; this.refreshPkRoom(); }
  }
  async finishPkRound() {
    if (!this.pk || this.pk.submitting) return;
    this.pk.submitting = true;
    this.modal = 'pk-finished';
    try {
      const { room } = await this.platform.pkRooms.finish(this.pk.room.code, this.game.state.steps);
      this.applyPkRoom(room);
    } catch (error) {
      console.warn('Submit PK result failed.', error);
      this.modal = null; this.platform.notify('成绩提交失败，请重试');
    } finally { if (this.pk) this.pk.submitting = false; }
  }
  syncFriends() {
    if (this.platform.friendBoard) this.platform.friendBoard.send('sync', { completed: this.progress.completedLevels });
  }
  async syncWorldLeaderboard() {
    if (!this.platform.worldLeaderboard?.available) return null;
    try {
      const profile = this.platform.readPlayerProfile?.() || {};
      return await this.platform.worldLeaderboard.submit({
        completed: this.progress.completedLevels,
        totalStars: this.progress.totalStars,
        nickname: profile.nickname || '',
        avatarUrl: profile.avatarUrl || '',
      });
    } catch (error) {
      console.warn('World leaderboard sync failed.', error);
      return null;
    }
  }
  async authorizePlayerProfile() {
    if (!this.platform.requestPlayerProfile) return false;
    const profile = await this.platform.requestPlayerProfile();
    if (!profile?.nickname && !profile?.avatarUrl) {
      this.platform.notify?.('需要授权头像昵称后才能展示完整榜单');
      return false;
    }
    this.modal = null;
    this.syncFriends();
    await this.syncWorldLeaderboard();
    return true;
  }
  async loadWorldLeaderboard(force = false) {
    if (!this.platform.worldLeaderboard?.available) {
      this.worldBoard = { state: 'error', rows: [], error: new Error('微信云函数不可用') };
      return [];
    }
    if (!force && (this.worldBoard.state === 'loading' || this.worldBoard.state === 'ready')) {
      return this.worldBoard.rows;
    }
    this.worldBoard = { ...this.worldBoard, state: 'loading', error: null };
    try {
      const rows = await this.platform.worldLeaderboard.load(50);
      this.worldBoard = { state: 'ready', rows, error: null };
      return rows;
    } catch (error) {
      this.worldBoard = { state: 'error', rows: [], error };
      console.warn('World leaderboard load failed.', error);
      return [];
    }
  }
  syncLevelFriends() {
    const record = this.progress.state.records[this.game.level.id];
    if (record && this.platform.friendBoard) this.platform.friendBoard.send('level-sync', {
      levelId: this.game.level.id, steps: record.bestSteps,
    });
  }
  campaignEntries(id = this.levelCampaign) {
    return this.levels.map((level, index) => ({ level, index }))
      .filter(({ level }) => (level.campaign || 'classic') === id);
  }
  campaignAvailable(id = this.levelCampaign) {
    if (id === 'classic' || id === 'coop' || id === 'pk') return true;
    return this.campaignEntries('classic').slice(0, 6)
      .every(({ level }) => this.progress.state.records[level.id]);
  }
  campaignLevelNumber(index = this.levelIndex) {
    if (this.pk?.level?.bankNo) return this.pk.level.bankNo;
    return this.campaignEntries(this.levels[index]?.campaign || 'classic')
      .findIndex(entry => entry.index === index) + 1;
  }
  nextLevelIndex(index = this.levelIndex) {
    const entries = this.campaignEntries(this.levels[index]?.campaign || 'classic');
    const position = entries.findIndex(entry => entry.index === index);
    return position >= 0 ? entries[position + 1]?.index ?? null : null;
  }
  resumeLevelIndex(id = this.levelCampaign) {
    const entries = this.campaignEntries(id);
    const unfinished = entries.find(({ level }) => !this.progress.state.records[level.id]);
    return unfinished?.index ?? entries.at(-1)?.index ?? null;
  }
  openLevel(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.levels.length) return;
    if (!this.campaignAvailable(this.levels[index].campaign || 'classic')) {
      this.platform.notify('完成经典模式前 6 关后解锁冒险模式'); return;
    }
    if (!this.progress.isUnlocked(index)) { this.platform.notify('先完成前面的关卡吧'); return; }
    this.levelIndex = index;
    this.levelCampaign = this.levels[index].campaign || 'classic';
    this.game = new GameSession(this.levels[index]);
    this.route = 'game';
    this.modal = index === 0 && !this.progress.state.tutorialDone ? 'tutorial' : null;
    this.result = null;
    this.zoom = false;
  }
  navigate(route) {
    this.route = route;
    this.modal = null;
    if (route === 'levels') {
      this.levelView = 'campaigns';
      const position = this.campaignEntries().findIndex(entry => entry.index === this.levelIndex);
      this.listPage = Math.floor(Math.max(0, position) / 12);
    }
  }
  handle(action) {
    if (this.replay) { this.handleReplay(action); return; }
    if (this.modal) { this.handleModal(action); return; }
    if (action === 'home') { this.navigate('home'); return; }
    if (action === 'levels') { this.navigate('levels'); return; }
    if (action.startsWith('campaign:')) {
      const campaign = action.slice('campaign:'.length);
      if (campaign === 'pk') {
        this.startPk('pk');
        return;
      }
      if (campaign === 'coop') {
        this.startPk('coop');
        return;
      }
      if (!campaigns.some(item => item.id === campaign)) return;
      this.levelCampaign = campaign;
      this.levelView = 'levels';
      this.listPage = 0;
      return;
    }
    if (action === 'level-campaigns') { this.levelView = 'campaigns'; return; }
    if (action === 'friends') { this.friendsTab = 'friends'; this.modal = 'friends'; return; }
    if (action.startsWith('friends:')) {
      return;
    }
    if (action === 'start') {
      if (this.progress.allComplete) this.platform.notify('地图关卡正在开发中');
      else {
        let index = this.resumeLevelIndex();
        if (index === null || this.progress.state.records[this.levels[index].id]) {
          const campaign = campaigns.map(item => item.id).find(id => {
            const candidate = this.resumeLevelIndex(id);
            return candidate !== null && !this.progress.state.records[this.levels[candidate].id];
          });
          if (campaign) { this.levelCampaign = campaign; index = this.resumeLevelIndex(campaign); }
        }
        if (index !== null) this.openLevel(index);
      }
      return;
    }
    if (action === 'settings') { this.settingsReturn = null; this.modal = 'settings'; return; }
    if (action.startsWith('level:')) { this.openLevel(Number(action.split(':')[1])); return; }
    if (action === 'previous' || action === 'following') {
      const count = this.campaignEntries().length;
      this.listPage = Math.max(0, Math.min(Math.ceil(count / 12) - 1, this.listPage + (action === 'following' ? 1 : -1)));
      return;
    }
    if (this.route !== 'game') return;
    if (action === 'zoom') { this.zoom = !this.zoom; return; }
    if (action === 'menu') { this.modal = 'menu'; return; }
    if (action === 'undo') {
      if (this.pk) {
        if (this.pk.room.mode === 'coop') this.platform.notify('合作模式不能单独撤销');
        else if (!this.game.undo()) this.platform.notify('暂无可撤销的操作');
        return;
      }
      if (!this.game.history.length) this.platform.notify('暂无可撤销的操作');
      else if (!this.progress.state.cards) this.modal = 'cards';
      else if (this.progress.spendCard()) this.game.undo();
      return;
    }
    if (!directions[action]) return;
    if (this.pk && (this.pk.room.mode || 'pk') === 'coop') {
      this.moveCoop(action);
      return;
    }
    const previousDeadlock = this.game.deadlock;
    if (!this.game.move(action)) return;
    if (this.game.complete) {
      if (this.pk) { this.finishPkRound(); return; }
      const stars = this.game.level.minSteps ? score(this.game.state.steps, this.game.level.minSteps) : 0;
      const saved = this.progress.finish(this.game.level, this.game.state.steps, stars, this.game.moves);
      if (saved) { this.syncLevelFriends(); this.syncFriends(); this.syncWorldLeaderboard(); }
      this.result = { stars, steps: this.game.state.steps, saved };
      this.modal = 'win';
    } else if (this.game.deadlock && !previousDeadlock) {
      this.modal = 'deadlock';
    }
  }
  handleModal(action) {
    if (action === 'dismiss') action = 'close';
    if (action === 'close' && !['win', 'pk-choice', 'pk-loading', 'pk-room', 'pk-finished', 'pk-result', 'pk-cancelled'].includes(this.modal)) {
      this.modal = this.modal === 'settings' ? this.settingsReturn : null;
      this.settingsReturn = null;
      return;
    }
    if (this.modal === 'pk-choice' && action === 'pk-create') {
      this.createPkRoom();
    } else if (this.modal === 'pk-choice' && action === 'pk-join') {
      this.promptJoinPkRoom();
    } else if (this.modal === 'pk-room' && action === 'pk-share') {
      this.platform.pkRooms.share(this.pk.room.code, this.roomMode || 'pk');
    } else if (this.modal === 'pk-room' && action === 'pk-ready-toggle') {
      this.setPkReady();
    } else if (this.modal === 'pk-room' && action === 'pk-start-match') {
      this.startPkMatch();
    } else if (this.modal === 'pk-result' && action === 'pk-restart') {
      this.createPkRoom();
    } else if (['pk-choice', 'pk-room', 'pk-finished', 'pk-result', 'pk-cancelled'].includes(this.modal)
      && (action === 'levels' || action === 'home')) {
      const code = this.pk?.room?.code;
      if (code) this.platform.pkRooms.leave(code).catch(() => {});
      this.platform.pkRooms?.setSharedRoom(''); this.pk = null; this.navigate(action);
    } else if (this.modal === 'friends' && (action === 'friends:tab-friends' || action === 'friends:tab-world')) {
      this.friendsTab = action === 'friends:tab-world' ? 'world' : 'friends';
      if (this.friendsTab === 'world') this.loadWorldLeaderboard();
    } else if (this.modal === 'friends' && action === 'friends:refresh' && this.friendsTab === 'friends') {
      if (this.platform.friendBoard) this.platform.friendBoard.send(action.slice(8), {
        completed: this.progress.completedLevels,
      });
    } else if (this.modal === 'friends' && action === 'friends:refresh' && this.friendsTab === 'world') {
      this.loadWorldLeaderboard(true);
    } else if (this.modal === 'profile' && action === 'authorize-profile') {
      this.authorizePlayerProfile();
    } else if (this.modal === 'tutorial' && (action === 'understood' || action === 'skip')) {
      this.progress.finishTutorial(); this.modal = null;
    } else if (this.modal === 'deadlock') {
      if (action === 'restart') { this.game.restart(); this.modal = null; }
      if (action === 'undo') { this.modal = null; this.handle('undo'); }
    } else if (this.modal === 'menu' || this.modal === 'settings') {
      if (action === 'replay-saved') this.startReplay(this.progress.state.solutions[this.game.level.id]?.moves);
      if (action === 'restart') {
        if (this.pk?.room.mode === 'coop') { this.platform.notify('合作模式不能单独重开'); return; }
        this.game.restart();
        if (this.pk) this.pk.startedAt = this.now();
        this.modal = null;
      }
      if (action === 'give-up' || action === 'levels') {
        const code = this.pk?.room?.code;
        if (code) this.platform.pkRooms.leave(code).catch(() => {});
        this.pk = null; this.navigate('levels');
      }
      if (action === 'home') this.navigate(action);
      if (['music', 'sound', 'vibration'].includes(action)) this.progress.toggle(action);
    } else if (this.modal === 'win') {
      if (action === 'replay-current') { this.startReplay(this.game.moves); return; }
      if (['level-refresh', 'level-previous', 'level-next'].includes(action)) {
        if (this.platform.friendBoard) this.platform.friendBoard.send(action);
        return;
      }
      if (action === 'retry') this.openLevel(this.levelIndex);
      if (action === 'home' || action === 'levels') this.navigate(action);
      if (action === 'next') {
        if (!this.result.saved) {
          this.result.saved = this.progress.finish(this.game.level, this.result.steps, this.result.stars, this.game.moves);
          if (this.result.saved) { this.syncLevelFriends(); this.syncFriends(); this.syncWorldLeaderboard(); }
        }
        const next = this.nextLevelIndex();
        if (this.result.saved && next !== null) this.openLevel(next);
      }
    }
  }
}
