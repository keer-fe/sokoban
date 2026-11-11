import { runGame } from '../app/main.js';

const canvas = document.querySelector('canvas');
const tone = (frequency, duration = .075) => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const audio = new AudioContext();
  const oscillator = audio.createOscillator(), gain = audio.createGain();
  oscillator.type = 'sine'; oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.09, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(); oscillator.stop(audio.currentTime + duration);
  oscillator.onended = () => audio.close();
};
runGame({
  canvas,
  createImage: () => new Image(),
  storage: localStorage,
  size: () => ({ width: window.innerWidth, height: window.innerHeight, dpr: Math.min(2, window.devicePixelRatio || 1) }),
  frame: (fn) => requestAnimationFrame(fn),
  onResize: (fn) => window.addEventListener('resize', fn),
  onTouch: (fn) => {
    canvas.addEventListener('pointerdown', (event) => fn('start', { x: event.clientX, y: event.clientY }));
    canvas.addEventListener('pointermove', (event) => { if (event.buttons) fn('move', { x: event.clientX, y: event.clientY }); });
    canvas.addEventListener('pointerup', (event) => fn('end', { x: event.clientX, y: event.clientY }));
    canvas.addEventListener('pointercancel', () => fn('cancel', { x: 0, y: 0 }));
  },
  onKey: (fn) => window.addEventListener('keydown', (event) => {
    const directions = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left' };
    if (directions[event.key]) { event.preventDefault(); fn(directions[event.key]); }
  }),
  sound: (kind) => {
    const notes = {
      step: [310, .07], push: [230, .13], goal: [620, .22],
      win: [770, .34], tap: [440, .09]
    };
    tone(...(notes[kind] || notes.tap));
  }
});
