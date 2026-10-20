import fs from 'node:fs';
import path from 'node:path';

const RATE = 22050;
const TAU = Math.PI * 2;
const outputDir = path.resolve('assets/audio');
fs.mkdirSync(outputDir, { recursive: true });

function wav(name, duration, render, peak = 0.86) {
  const samples = new Float64Array(Math.round(duration * RATE));
  render(samples);
  let max = 0;
  for (const sample of samples) max = Math.max(max, Math.abs(sample));
  const scale = max ? peak / max : 1;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(RATE, 24); buffer.writeUInt32LE(RATE * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  samples.forEach((sample, index) => buffer.writeInt16LE(
    Math.round(Math.max(-1, Math.min(1, sample * scale)) * 32767), 44 + index * 2));
  fs.writeFileSync(path.join(outputDir, name), buffer);
}

function addTone(samples, start, duration, frequency, volume, options = {}) {
  const from = Math.max(0, Math.floor(start * RATE));
  const to = Math.min(samples.length, Math.ceil((start + duration) * RATE));
  const attack = options.attack ?? 0.012;
  const release = options.release ?? Math.min(0.12, duration * 0.45);
  for (let index = from; index < to; index += 1) {
    const t = index / RATE - start;
    const envelope = Math.min(1, t / attack, (duration - t) / release);
    const bend = options.bend ? options.bend * t / duration : 0;
    const phase = TAU * frequency * t + TAU * bend * t;
    const voice = Math.sin(phase)
      + (options.wood ?? 0.28) * Math.sin(phase * 2.01)
      + (options.air ?? 0.08) * Math.sin(phase * 3.99);
    const decay = options.decay ? Math.exp(-options.decay * t) : 1;
    samples[index] += voice * volume * Math.max(0, envelope) * decay;
  }
}

function addNoise(samples, start, duration, volume, seed = 1) {
  let value = seed >>> 0;
  const from = Math.max(0, Math.floor(start * RATE));
  const to = Math.min(samples.length, Math.ceil((start + duration) * RATE));
  let previous = 0;
  for (let index = from; index < to; index += 1) {
    value = (value * 1664525 + 1013904223) >>> 0;
    const white = value / 0xffffffff * 2 - 1;
    previous = previous * 0.55 + white * 0.45;
    const t = (index - from) / RATE;
    const envelope = Math.sin(Math.PI * Math.min(1, t / duration)) ** 2;
    samples[index] += previous * volume * envelope;
  }
}

// Eight bars at 112 BPM. A two-bar hook repeats with small answers in bars 4
// and 8; the kick, clap and offbeat shaker make the pulse audible on phones.
const beat = 60 / 112;
wav('workshop-garden-loop.wav', beat * 32, (samples) => {
  const chords = [
    [261.63, 329.63, 392], [196, 246.94, 392],
    [220, 261.63, 329.63], [196, 246.94, 392],
    [261.63, 329.63, 392], [196, 246.94, 392],
    [220, 261.63, 329.63], [196, 246.94, 392],
  ];
  const hook = [
    [0, 2], [0.75, 1], [1.5, 2], [2.5, 1], [3.25, 0],
    [0, 2], [0.75, 1], [1.5, 2], [2.25, 1], [3, 2],
  ];
  chords.forEach((chord, bar) => {
    const start = bar * beat * 4;
    chord.forEach((frequency, voice) => addTone(samples, start, beat * 3.8, frequency / 2,
      0.016 - voice * 0.003, { attack: 0.08, release: 0.25, wood: 0.08, air: 0.02 }));
    hook.slice((bar % 2) * 5, (bar % 2 + 1) * 5).forEach(([offset, note], index) => {
      const frequency = chord[note] * 2;
      addTone(samples, start + offset * beat, beat * 0.42, frequency, index === 0 ? 0.075 : 0.06,
        { attack: 0.003, release: 0.1, decay: 3.5, wood: 0.42, air: 0.04 });
    });
    for (let pulse = 0; pulse < 4; pulse += 1) {
      const at = start + pulse * beat;
      addTone(samples, at, beat * 0.38, chord[0] / 2, 0.055,
        { attack: 0.003, release: 0.08, decay: 9, wood: 0.42, air: 0 });
      if (pulse % 2 === 0) {
        addTone(samples, at, 0.095, 72, 0.11,
          { attack: 0.002, release: 0.065, decay: 19, bend: -12, wood: 0.08, air: 0 });
      } else {
        addNoise(samples, at, 0.105, 0.045, bar * 11 + pulse);
      }
      addNoise(samples, at + beat * 0.5, 0.045, 0.018, bar * 17 + pulse);
    }
  });
}, 0.72);

wav('ui-tap.wav', 0.09, (s) => addTone(s, 0, 0.085, 660, 0.24,
  { attack: 0.002, release: 0.04, decay: 10, wood: 0.35 }));
wav('step.wav', 0.11, (s) => {
  addTone(s, 0, 0.09, 196, 0.18, { attack: 0.002, release: 0.045, decay: 18, wood: 0.5, air: 0 });
  addTone(s, 0.018, 0.065, 587.33, 0.055,
    { attack: 0.002, release: 0.04, decay: 17, wood: 0.38, air: 0 });
  addNoise(s, 0.005, 0.045, 0.025, 21);
});
wav('push.wav', 0.2, (s) => {
  addTone(s, 0, 0.17, 110, 0.29, { attack: 0.003, release: 0.07, decay: 9, bend: -8, wood: 0.58, air: 0 });
  addTone(s, 0.085, 0.09, 392, 0.11,
    { attack: 0.002, release: 0.045, decay: 12, wood: 0.48, air: 0 });
  addNoise(s, 0.012, 0.1, 0.04, 32);
});
wav('goal.wav', 0.38, (s) => [523.25, 659.25, 783.99].forEach((f, i) =>
  addTone(s, i * 0.075, 0.22, f, 0.18, { attack: 0.004, release: 0.12, decay: 5, wood: 0.32 })));
wav('undo.wav', 0.28, (s) => [523.25, 440, 349.23].forEach((f, i) =>
  addTone(s, i * 0.055, 0.18, f, 0.14, { attack: 0.004, release: 0.09, decay: 6, wood: 0.28 })));
wav('blocked.wav', 0.13, (s) => addTone(s, 0, 0.12, 92, 0.24,
  { attack: 0.002, release: 0.07, decay: 14, bend: -5, wood: 0.7, air: 0 }));
wav('deadlock.wav', 0.5, (s) => [293.66, 261.63, 220].forEach((f, i) =>
  addTone(s, i * 0.11, 0.25, f, 0.13, { attack: 0.008, release: 0.12, decay: 4, wood: 0.25 })));
wav('win.wav', 1.25, (s) => {
  [261.63, 329.63, 392, 523.25, 659.25].forEach((f, i) =>
    addTone(s, i * 0.13, 0.42, f, 0.13, { attack: 0.006, release: 0.2, decay: 2.7, wood: 0.3 }));
  [261.63, 329.63, 392].forEach((f) => addTone(s, 0.68, 0.55, f, 0.07,
    { attack: 0.03, release: 0.25, decay: 1.4, wood: 0.12 }));
});

console.log(`Generated audio in ${outputDir}`);
