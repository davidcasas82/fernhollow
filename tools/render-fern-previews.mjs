/**
 * Render one-loop song previews and the effects reel to docs/previews/audio/.
 * Run from the repo root: node tools/render-fern-previews.mjs
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SFX, SFX_REEL_CUES, TRACKS, sfxReelPlan } from "../js/fern-score.js";
import { mixClips, renderScore } from "../js/fern-synth.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "previews", "audio");
const sampleRate = 44100;

function wavBuffer(left, right, rate) {
  const frames = left.length;
  const dataSize = frames * 4;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < frames; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    buf.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(r * 32767), 46 + i * 4);
  }
  return buf;
}

function encode(left, right, dest) {
  const wav = path.join(os.tmpdir(), `fern-preview-${process.pid}-${path.basename(dest)}.wav`);
  fs.writeFileSync(wav, wavBuffer(left, right, sampleRate));
  const run = spawnSync(
    "ffmpeg",
    ["-y", "-hide_banner", "-loglevel", "error", "-fflags", "+bitexact", "-i", wav, "-map_metadata", "-1", "-codec:a", "libmp3lame", "-b:a", "192k", "-flags:a", "+bitexact", dest],
    { encoding: "utf8" }
  );
  fs.rmSync(wav, { force: true });
  if (run.status !== 0) {
    throw new Error(run.stderr || `could not encode ${path.basename(dest)}`);
  }
}

fs.mkdirSync(outDir, { recursive: true });

const jobs = [
  ["title-heroic.mp3", () => renderScore(TRACKS.title, sampleRate)],
  ["courtyard-battle.mp3", () => renderScore(TRACKS.courtyard, sampleRate)],
  ["boss.mp3", () => renderScore(TRACKS.boss, sampleRate)],
  [
    "sfx-reel.mp3",
    () => {
      const plan = sfxReelPlan();
      const clips = plan.events.map((ev) => renderScore(SFX[ev.name], sampleRate));
      return mixClips(clips, plan.events, plan.seconds, sampleRate, 0.4);
    },
  ],
];

for (const [name, make] of jobs) {
  const clip = make();
  const dest = path.join(outDir, name);
  encode(clip.left, clip.right, dest);
  const seconds = clip.seconds;
  if (seconds < 30 || seconds > 45) {
    throw new Error(`${name} is ${seconds}s`);
  }
  console.log(`${name} ${seconds.toFixed(2)}s`);
}

const reelCues = sfxReelPlan().events.map((ev) => ev.name);
for (const cue of SFX_REEL_CUES) {
  if (!reelCues.includes(cue)) throw new Error(`reel missing ${cue}`);
}
