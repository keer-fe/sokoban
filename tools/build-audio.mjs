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

// 8 bars at 96 BPM. The last chord resolves into the first without a fade,
// producing a loop that feels continuous instead of restarting.
wav('workshop-garden-loop.wav', 20, (samples) => {
  const beat = 0.625;
  const chords = [
    [261.63, 329.63, 392], [220, 261.63, 329.63],
    [174.61, 220, 261.63], [196, 246.94, 293.66],
    [261.63, 329.63, 392], [220, 261.63, 329.63],
    [174.61, 220, 261.63], [196, 246.94, 392],
  ];
  const melody = [0, 2, 1, 2, 0, 1, 2, 1, 0, 2, 1, 0, 0, 1, 2, 1];
  chords.forEach((chord, bar) => {
    const start = bar * beat * 4;
    chord.forEach((frequency, voice) => addTone(samples, start, beat * 4, frequency / 2,
      0.022 - voice * 0.003, { attack: 0.2, release: 0.22, wood: 0.08, air: 0.03 }));
    for (let step = 0; step < 2; step += 1) {
      const frequency = chord[melody[(bar * 2 + step) % melody.length]] * 2;
      addTone(samples, start + step * beat * 2, beat * 1.7, frequency, 0.048,
        { attack: 0.008, release: 0.18, decay: 1.55, wood: 0.34, air: 0.05 });
    }
    for (let pulse = 0; pulse < 4; pulse += 1) {
      addTone(samples, start + pulse * beat, 0.075, chord[0] / 2, 0.035,
        { attack: 0.004, release: 0.06, decay: 12, wood: 0.55, air: 0 });
      if (pulse % 2) addNoise(samples, start + pulse * beat, 0.055, 0.006, bar * 11 + pulse);
    }
  });
}, 0.72);

wav('ui-tap.wav', 0.09, (s) => addTone(s, 0, 0.085, 660, 0.24,
  { attack: 0.002, release: 0.04, decay: 10, wood: 0.35 }));
wav('step.wav', 0.11, (s) => {
  addTone(s, 0, 0.1, 185, 0.2, { attack: 0.002, release: 0.055, decay: 16, wood: 0.55, air: 0 });
  addNoise(s, 0.005, 0.055, 0.035, 21);
});
wav('push.wav', 0.2, (s) => {
  addTone(s, 0, 0.19, 105, 0.3, { attack: 0.004, release: 0.08, decay: 8, bend: -9, wood: 0.62, air: 0 });
  addNoise(s, 0.015, 0.12, 0.05, 32);
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
