import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, "public", "assets", "music", "birthday.wav");
const sampleRate = 22050;
const duration = 24;
const frameCount = sampleRate * duration;
const samples = new Float64Array(frameCount);

const melody = [
  [261.63, 0], [329.63, 1.5], [392.0, 3], [523.25, 4.5],
  [440.0, 6], [392.0, 7.5], [329.63, 9], [293.66, 10.5],
  [329.63, 12], [392.0, 13.5], [493.88, 15], [587.33, 16.5],
  [523.25, 18], [440.0, 19.5], [392.0, 21], [329.63, 22.5],
];

const chords = [
  [[130.81, 164.81, 196.0], 0],
  [[110.0, 164.81, 220.0], 6],
  [[146.83, 185.0, 220.0], 12],
  [[130.81, 164.81, 196.0], 18],
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

for (const [notes, start] of chords) {
  for (const frequency of notes) addTone(frequency, start, 6.2, 0.045);
}
for (const [frequency, start] of melody) addTone(frequency, start, 1.7, 0.16, true);

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
