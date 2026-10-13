import { levels } from './levels.js';
import { GameSession, directions, score } from './engine.js';
import { ProgressStore } from './progress.js';

export class GameController {
  constructor(platform, catalog = levels) {
    this.platform = platform;
    this.levels = catalog;
    this.progress = new ProgressStore(platform, catalog);
    this.route = 'home';
    this.modal = null;
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
  openLevel(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.levels.length) return;
    if (!this.progress.isUnlocked(index)) { this.platform.notify('先完成前面的关卡吧'); return; }
    this.levelIndex = index;
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
      this.listPage = Math.floor(this.levelIndex / 12);
    }
  }
  handle(action) {
    if (this.replay) { this.handleReplay(action); return; }
    if (this.modal) { this.handleModal(action); return; }
    if (action === 'home') { this.navigate('home'); return; }
    if (action === 'levels') { this.navigate('levels'); return; }
    if (action === 'friends') { this.navigate('friends'); return; }
    if (action.startsWith('friends:')) {
      if (this.route === 'friends' && this.platform.friendBoard) {
        this.platform.friendBoard.send(action.slice(8), { completed: this.progress.completedLevels });
      }
      return;
    }
    if (action === 'start') {
      if (this.progress.allComplete) this.platform.notify('地图关卡正在开发中');
      else this.openLevel(this.progress.unlocked);
      return;
    }
    if (action === 'signin') { this.modal = 'signin'; return; }
    if (action.startsWith('level:')) { this.openLevel(Number(action.split(':')[1])); return; }
    if (action === 'previous' || action === 'following') {
      const count = this.levels.length;
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
    if (action === 'close' && this.modal !== 'win') { this.modal = null; return; }
    if (this.modal === 'tutorial' && (action === 'understood' || action === 'skip')) {
      this.progress.finishTutorial(); this.modal = null;
    } else if (this.modal === 'deadlock') {
      if (action === 'restart') { this.game.restart(); this.modal = null; }
      if (action === 'undo') { this.modal = null; this.handle('undo'); }
    } else if (this.modal === 'menu') {
      if (action === 'replay-saved') this.startReplay(this.progress.state.solutions[this.game.level.id]?.moves);
      if (action === 'restart') { this.game.restart(); this.modal = null; }
      if (action === 'levels' || action === 'home') this.navigate(action);
      if (action === 'music' || action === 'sound') this.progress.toggle(action);
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
        if (this.result.saved) this.openLevel(this.levelIndex + 1);
      }
    }
  }
}
