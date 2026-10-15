import { campaigns, levels } from './levels.js';
import { GameSession, directions, score } from './engine.js';
import { ProgressStore } from './progress.js';

export class GameController {
  constructor(platform, catalog = levels) {
    this.platform = platform;
    this.levels = catalog;
    this.progress = new ProgressStore(platform, catalog);
    this.route = 'home';
    this.modal = null;
    this.settingsReturn = null;
    this.friendsTab = 'friends';
    this.levelCampaign = 'classic';
    this.listPage = 0;
    this.levelIndex = 0;
    this.game = null;
    this.result = null;
    this.zoom = false;
    this.replay = null;
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
  syncFriends() {
    if (this.platform.friendBoard) this.platform.friendBoard.send('sync', { completed: this.progress.completedLevels });
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
    if (id === 'classic' || id === 'coop') return true;
    return this.campaignEntries('classic').slice(0, 6)
      .every(({ level }) => this.progress.state.records[level.id]);
  }
  campaignLevelNumber(index = this.levelIndex) {
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
      if (!campaigns.some(item => item.id === campaign)) return;
      this.levelCampaign = campaign;
      this.listPage = 0;
      return;
    }
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
    if (action === 'signin') { this.modal = 'signin'; return; }
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
      if (!this.game.history.length) this.platform.notify('暂无可撤销的操作');
      else if (!this.progress.state.cards) this.modal = 'cards';
      else if (this.progress.spendCard()) this.game.undo();
      return;
    }
    if (!directions[action]) return;
    const previousDeadlock = this.game.deadlock;
    if (!this.game.move(action)) return;
    if (this.game.complete) {
      const stars = this.game.level.minSteps ? score(this.game.state.steps, this.game.level.minSteps) : 0;
      const saved = this.progress.finish(this.game.level, this.game.state.steps, stars, this.game.moves);
      if (saved) { this.syncLevelFriends(); this.syncFriends(); }
      this.result = { stars, steps: this.game.state.steps, saved };
      this.modal = 'win';
    } else if (this.game.deadlock && !previousDeadlock) {
      this.modal = 'deadlock';
    }
  }
  handleModal(action) {
    if (action === 'dismiss') action = 'close';
    if (action === 'close' && this.modal !== 'win') {
      this.modal = this.modal === 'settings' ? this.settingsReturn : null;
      this.settingsReturn = null;
      return;
    }
    if (this.modal === 'friends' && (action === 'friends:tab-friends' || action === 'friends:tab-world')) {
      this.friendsTab = action === 'friends:tab-world' ? 'world' : 'friends';
    } else if (this.modal === 'friends' && action === 'friends:refresh' && this.friendsTab === 'friends') {
      if (this.platform.friendBoard) this.platform.friendBoard.send(action.slice(8), {
        completed: this.progress.completedLevels,
      });
    } else if (this.modal === 'tutorial' && (action === 'understood' || action === 'skip')) {
      this.progress.finishTutorial(); this.modal = null;
    } else if (this.modal === 'deadlock') {
      if (action === 'restart') { this.game.restart(); this.modal = null; }
      if (action === 'undo') { this.modal = null; this.handle('undo'); }
    } else if (this.modal === 'menu' || this.modal === 'settings') {
      if (this.modal === 'menu' && action === 'settings') {
        this.settingsReturn = 'menu'; this.modal = 'settings'; return;
      }
      if (action === 'replay-saved') this.startReplay(this.progress.state.solutions[this.game.level.id]?.moves);
      if (action === 'restart') { this.game.restart(); this.modal = null; }
      if (action === 'levels' || action === 'home') this.navigate(action);
      if (action === 'music' || action === 'sound' || action === 'vibration') {
        const changed = this.progress.toggle(action);
        if (changed && action === 'vibration' && this.progress.state.vibration) this.platform.vibrate?.();
      }
    } else if (this.modal === 'signin' && action === 'claim') {
      if (!this.progress.canSignIn(this.now())) this.platform.notify('今天已领取，明天再来吧');
      else if (this.progress.signIn(this.now())) this.platform.notify('已获得 5 张撤销卡');
    } else if (this.modal === 'cards') {
      if (action === 'signin') this.modal = 'signin';
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
          if (this.result.saved) { this.syncLevelFriends(); this.syncFriends(); }
        }
        const next = this.nextLevelIndex();
        if (this.result.saved && next !== null) this.openLevel(next);
      }
    }
  }
}
