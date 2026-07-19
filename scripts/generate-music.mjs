import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, "public", "assets", "music", "happy-birthday.wav");
const sampleRate = 22050;
const tempo = 82;
const beat = 60 / tempo;
const duration = 22;
const frameCount = sampleRate * duration;
const samples = new Float64Array(frameCount);

// Public-domain "Happy Birthday to You" melody, arranged as a gentle music-box instrumental.
const melody = [
  [392.0, 0, .5], [392.0, .5, .5], [440.0, 1, 1], [392.0, 2, 1], [523.25, 3, 1], [493.88, 4, 2],
  [392.0, 6.5, .5], [392.0, 7, .5], [440.0, 7.5, 1], [392.0, 8.5, 1], [587.33, 9.5, 1], [523.25, 10.5, 2],
  [392.0, 13, .5], [392.0, 13.5, .5], [783.99, 14, 1], [659.25, 15, 1], [523.25, 16, 1], [493.88, 17, 1], [440.0, 18, 2],
  [698.46, 20.5, .5], [698.46, 21, .5], [659.25, 21.5, 1], [523.25, 22.5, 1], [587.33, 23.5, 1], [523.25, 24.5, 2],
];

const chords = [
  [[130.81, 164.81, 196.0], 0, 4],
  [[123.47, 196.0, 246.94], 4, 2],
  [[130.81, 164.81, 196.0], 6.5, 3],
  [[98.0, 146.83, 196.0], 9.5, 3],
  [[130.81, 164.81, 196.0], 13, 3],
  [[87.31, 130.81, 174.61], 16, 4],
  [[87.31, 130.81, 174.61], 20.5, 2],
  [[98.0, 146.83, 196.0], 22.5, 2],
  [[130.81, 164.81, 196.0], 24.5, 2],
];

function addTone(frequency, start, length, volume, bell = false) {
  const startFrame = Math.floor(start * sampleRate);
  const endFrame = Math.min(frameCount, Math.floor((start + length) * sampleRate));
  for (let frame = startFrame; frame < endFrame; frame += 1) {
    const time = (frame - startFrame) / sampleRate;
    const attack = Math.min(1, time / 0.08);
    const release = Math.min(1, (length - time) / (bell ? 0.7 : 1.2));
    const envelope = attack * Math.max(0, release) * (bell ? Math.exp(-time * 0.38) : 1);
    const fundamental = Math.sin(Math.PI * 2 * frequency * time);
    const warmth = Math.sin(Math.PI * 2 * frequency * 2 * time) * 0.22;
    const shimmer = Math.sin(Math.PI * 2 * frequency * 3 * time) * 0.08;
    samples[frame] += (fundamental + warmth + shimmer) * envelope * volume;
  }
}

for (const [notes, start, length] of chords) {
  for (const frequency of notes) addTone(frequency, start * beat, length * beat + .18, 0.038);
}
for (const [frequency, start, length] of melody) {
  addTone(frequency, start * beat, length * beat * .94, 0.18, true);
}

const buffer = Buffer.alloc(44 + frameCount * 2);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + frameCount * 2, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(frameCount * 2, 40);

for (let index = 0; index < frameCount; index += 1) {
  const edgeFade = Math.min(1, index / (sampleRate * 0.08), (frameCount - index) / (sampleRate * 0.35));
  const sample = Math.max(-1, Math.min(1, samples[index] * edgeFade));
  buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * 2);
}

await mkdir(dirname(output), { recursive: true });
await writeFile(output, buffer);
console.log(`Generated ${output}`);
