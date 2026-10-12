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
    this.filter = '简单';
    this.listPage = 0;
    this.levelIndex = 0;
    this.game = null;
    this.result = null;
  }
  now() { return this.platform.wallNow ? this.platform.wallNow() : Date.now(); }
  openLevel(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.levels.length) return;
    if (index > this.progress.unlocked) { this.platform.notify('先完成前面的关卡吧'); return; }
    this.levelIndex = index;
    this.game = new GameSession(this.levels[index]);
    this.route = 'game';
    this.modal = index === 0 && !this.progress.state.tutorialDone ? 'tutorial' : null;
    this.result = null;
  }
  navigate(route) {
    this.route = route;
    this.modal = null;
    if (route === 'levels') this.filter = this.levels[this.levelIndex].difficulty;
    this.listPage = 0;
  }
  handle(action) {
    if (this.modal) { this.handleModal(action); return; }
    if (action === 'home') { this.navigate('home'); return; }
    if (action === 'levels') { this.navigate('levels'); return; }
    if (action === 'start') {
      if (this.progress.allComplete) this.platform.notify('地图关卡正在开发中');
      else this.openLevel(this.progress.unlocked);
      return;
    }
    if (action === 'signin') { this.modal = 'signin'; return; }
    if (action.startsWith('level:')) { this.openLevel(Number(action.split(':')[1])); return; }
    if (action.startsWith('filter:')) { this.filter = action.slice(7); this.listPage = 0; return; }
    if (action === 'previous' || action === 'following') {
      const count = this.levels.filter((level) => level.difficulty === this.filter).length;
      this.listPage = Math.max(0, Math.min(Math.ceil(count / 12) - 1, this.listPage + (action === 'following' ? 1 : -1)));
      return;
    }
    if (this.route !== 'game') return;
    if (action === 'menu') { this.modal = 'menu'; return; }
    if (action === 'undo') {
      if (!this.game.history.length) this.platform.notify('暂无可撤销的操作');
      else if (!this.progress.state.cards) this.modal = 'cards';
      else if (this.progress.spendCard()) this.game.undo();
      return;
    }
    if (directions[action] && this.game.move(action) && this.game.complete) {
      const stars = score(this.game.state.steps, this.game.level.minSteps);
      const saved = this.progress.finish(this.game.level, this.game.state.steps, stars);
      this.result = { stars, steps: this.game.state.steps, saved };
      this.modal = 'win';
    }
  }
  handleModal(action) {
    if (action === 'close' && this.modal !== 'win') { this.modal = null; return; }
    if (this.modal === 'tutorial' && (action === 'understood' || action === 'skip')) {
      this.progress.finishTutorial(); this.modal = null;
    } else if (this.modal === 'menu') {
      if (action === 'restart') { this.game.restart(); this.modal = null; }
      if (action === 'levels' || action === 'home') this.navigate(action);
      if (action === 'music' || action === 'sound') this.progress.toggle(action);
    } else if (this.modal === 'signin' && action === 'claim') {
      if (!this.progress.canSignIn(this.now())) this.platform.notify('今天已领取，明天再来吧');
      else if (this.progress.signIn(this.now())) this.platform.notify('已获得 5 张撤销卡');
    } else if (this.modal === 'cards') {
      if (action === 'signin') this.modal = 'signin';
    } else if (this.modal === 'win') {
      if (action === 'retry') this.openLevel(this.levelIndex);
      if (action === 'home' || action === 'levels') this.navigate(action);
      if (action === 'next') {
        if (!this.result.saved) this.result.saved = this.progress.finish(this.game.level, this.result.steps, this.result.stars);
        if (this.result.saved) this.openLevel(this.levelIndex + 1);
      }
    }
  }
}
