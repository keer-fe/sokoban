import { directions } from './game/engine.js';

export const musicSource = 'assets/audio/workshop-garden-loop.wav';

export const soundSources = {
  tap: 'assets/audio/ui-tap.wav',
  step: 'assets/audio/step.wav',
  push: 'assets/audio/push.wav',
  goal: 'assets/audio/goal.wav',
  undo: 'assets/audio/undo.wav',
  blocked: 'assets/audio/blocked.wav',
  deadlock: 'assets/audio/deadlock.wav',
  win: 'assets/audio/win.wav',
};

export function audioSnapshot(controller) {
  const game = controller.game;
  return {
    route: controller.route,
    modal: controller.modal,
    steps: game?.state.steps ?? null,
    boxes: game ? [...game.state.boxes] : [],
    goals: game ? new Set(game.board.goals) : new Set(),
    sound: controller.progress.state.sound,
  };
}

const boxesOnGoals = ({ boxes, goals }) => boxes.reduce((total, box) => total + (goals.has(box) ? 1 : 0), 0);

export function soundForAction(action, before, after) {
  if (directions[action]) {
    if (before.steps === after.steps) return 'blocked';
    if (after.modal === 'win' || after.modal === 'pk-result' || after.modal === 'pk-finished') return 'win';
    if (after.modal === 'deadlock') return 'deadlock';
    const pushed = before.boxes.some((box, index) => after.boxes[index] !== box);
    if (pushed && boxesOnGoals(after) > boxesOnGoals(before)) return 'goal';
    return pushed ? 'push' : 'step';
  }
  if (action === 'undo' && after.steps !== null && after.steps < before.steps) return 'undo';
  return 'tap';
}

export function createSoundBank(platform) {
  if (!platform.createAudio) return { play() {}, destroy() {} };
  const sounds = Object.fromEntries(Object.entries(soundSources).map(([name, src]) => [name,
    platform.createAudio(src, { volume: name === 'win' ? 0.62 : 0.48 })]));
  return {
    play(name) {
      const sound = sounds[name];
      if (!sound) return;
      if (sound.replay) sound.replay();
      else { if (sound.stop) sound.stop(); sound.play(); }
    },
    destroy() { Object.values(sounds).forEach(sound => sound.destroy()); },
  };
}
