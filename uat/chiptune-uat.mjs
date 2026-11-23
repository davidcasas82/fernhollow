/**
 * Chiptune pack: the game plays these loops and the quieter effects.
 * Run: node uat/chiptune-uat.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const js = (name) => pathToFileURL(path.join(root, "js", name)).href;

const { AudioBus } = await import(js("audio.js"));
const { BGM_VOLUME } = await import(js("constants.js"));
const { TRACKS, SFX, SFX_REEL_CUES, sfxReelPlan, fernBattleId, trackSeconds } = await import(
  js("fern-score.js")
);
const { renderScore, mixClips } = await import(js("fern-synth.js"));

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err: err.message });
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
  }
}

function rms(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

function lowShare(buf, sampleRate) {
  const c = 1 - Math.exp((-2 * Math.PI * 160) / sampleRate);
  let y = 0;
  let low = 0;
  let all = 0;
  for (let i = 0; i < buf.length; i++) {
    y += (buf[i] - y) * c;
    low += y * y;
    all += buf[i] * buf[i];
  }
  return all > 0 ? low / all : 0;
}

function peak(buf) {
  let p = 0;
  for (let i = 0; i < buf.length; i++) {
    const a = buf[i] < 0 ? -buf[i] : buf[i];
    if (a > p) p = a;
  }
  return p;
}

function melodyKey(events) {
  return events.map((ev) => ev.midi).join(",");
}

test("the chiptune is what the game plays", () => {
  assert.equal(fs.existsSync(path.join(root, "audio", "neon-swarm-1.mp3")), false);
  assert.equal(fs.existsSync(path.join(root, "audio", "neon-swarm-2.mp3")), false);
  assert.equal(fs.existsSync(path.join(root, "audio", "meta.json")), false);
  const bus = new AudioBus();
  assert.ok(bus.chiptune);
  bus.playMenuTheme();
  bus.menuMove();
  bus.menuSelect();
  bus.bossIntro();
  assert.equal(bus.chiptune.currentId, "title");
});

test("title music waits until the context is running, and ducks effects through the fade-in", () => {
  const gains = [];
  const sources = [];
  class GainParam {
    constructor() {
      this.value = 1;
      this.events = [];
    }
    cancelScheduledValues(t) {
      this.events.push(["cancel", t]);
    }
    setValueAtTime(v, t) {
      this.value = v;
      this.events.push(["set", v, t]);
    }
    linearRampToValueAtTime(v, t) {
      this.events.push(["ramp", v, t]);
    }
    exponentialRampToValueAtTime() {}
  }
  class MockContext {
    constructor() {
      this.state = "suspended";
      this.currentTime = 2;
      this.sampleRate = 8000;
      this.destination = {};
    }
    createGain() {
      const node = { gain: new GainParam(), connect() {} };
      gains.push(node);
      return node;
    }
    createBuffer(_channels, length) {
      const data = [new Float32Array(length), new Float32Array(length)];
      return {
        duration: length / this.sampleRate,
        getChannelData(i) {
          return data[i];
        },
        copyToChannel(src, i) {
          data[i].set(src.subarray(0, data[i].length));
        },
      };
    }
    createBufferSource() {
      const src = {
        buffer: null,
        loop: false,
        playbackRate: { value: 1 },
        connect() {},
        start() {
          src.started = true;
        },
        stop() {},
      };
      sources.push(src);
      return src;
    }
    resume() {
      return Promise.resolve();
    }
  }
  const prev = globalThis.window;
  globalThis.window = { AudioContext: MockContext };
  try {
    const bus = new AudioBus();
    bus.playMenuTheme();
    assert.equal(bus.chiptune.source, null);
    assert.equal(bus.chiptune.paused, true);
    assert.equal(sources.length, 0);
    bus.ctx.state = "running";
    bus.playMenuTheme();
    assert.equal(bus.chiptune.currentId, "title");
    assert.equal(bus.chiptune.paused, false);
    assert.equal(sources.length, 1);
    const music = gains[0].gain.events;
    const sfx = gains[1].gain.events;
    const fadeEnd = 2 + 0.35;
    assert.ok(music.some((e) => e[0] === "ramp" && e[1] === BGM_VOLUME && e[2] === fadeEnd));
    const ducked = sfx.filter((e) => e[0] === "set");
    assert.ok(ducked.some((e) => e[1] === 0.2 * 0.4 && e[2] === 2));
    assert.ok(ducked.some((e) => e[1] === 0.2 && e[2] === fadeEnd));
  } finally {
    if (prev === undefined) delete globalThis.window;
    else globalThis.window = prev;
  }
});

test("boss theme maps to the boss loop and other beds to courtyard", () => {
  assert.equal(fernBattleId({ id: "boss-pulse" }), "boss");
  assert.equal(fernBattleId({ id: "grid-wake" }), "courtyard");
  assert.equal(fernBattleId(null), "courtyard");
});

const rendered = {};
for (const id of ["title", "courtyard", "boss"]) {
  rendered[id] = renderScore(TRACKS[id], 44100);
}

test("each song is one loop between 30 and 45 seconds", () => {
  for (const id of ["title", "courtyard", "boss"]) {
    const sec = trackSeconds(TRACKS[id]);
    assert.ok(sec >= 30 && sec <= 45, `${id} is ${sec}s`);
    assert.ok(Math.abs(rendered[id].seconds - sec) < 0.02, id);
  }
  assert.ok(TRACKS.boss.bpm > TRACKS.courtyard.bpm);
  assert.ok(TRACKS.courtyard.bpm > TRACKS.title.bpm);
});

test("the three songs do not share a melody or a bass line", () => {
  const leads = ["title", "courtyard", "boss"].map((id) => melodyKey(TRACKS[id].channels.pulse1));
  const bass = ["title", "courtyard", "boss"].map((id) => melodyKey(TRACKS[id].channels.triangle));
  assert.equal(new Set(leads).size, 3);
  assert.equal(new Set(bass).size, 3);
  for (const id of ["title", "courtyard", "boss"]) {
    assert.ok(TRACKS[id].channels.pulse1.length > 16, id);
    assert.ok(TRACKS[id].channels.triangle.length > 16, id);
    assert.ok(TRACKS[id].channels.noise.some((ev) => ev.drum === "kick"), id);
    assert.ok(TRACKS[id].channels.noise.some((ev) => ev.drum === "snare"), id);
  }
});

test("courtyard bass is busier and louder than its melody", () => {
  const yard = TRACKS.courtyard.channels;
  assert.ok(yard.triangle.length > yard.pulse1.length);
  const mix = TRACKS.courtyard.mix;
  const bass = rms(rendered.courtyard.channels.triangle) * mix.triangle;
  const lead = rms(rendered.courtyard.channels.pulse1) * mix.pulse1;
  assert.ok(bass > lead * 1.35, `bass ${bass.toFixed(3)} lead ${lead.toFixed(3)}`);
  assert.ok(lowShare(rendered.courtyard.left, 44100) > lowShare(rendered.title.left, 44100));
});

test("rendered loops are audible, limited, and quiet at the seam", () => {
  for (const id of ["title", "courtyard", "boss"]) {
    const clip = rendered[id];
    const p = Math.max(peak(clip.left), peak(clip.right));
    assert.ok(p > 0.5 && p <= 0.92, `${id} peak ${p}`);
    assert.ok(rms(clip.left) > 0.04, `${id} rms`);
    const n = Math.floor(0.004 * clip.sampleRate);
    const tail = Math.max(peak(clip.left.subarray(clip.left.length - n)), peak(clip.right.subarray(clip.right.length - n)));
    assert.ok(tail < 0.08, `${id} seam ${tail}`);
  }
});

const sfxRendered = {};
for (const name of Object.keys(SFX)) sfxRendered[name] = renderScore(SFX[name], 44100);

test("effects stay quieter than the songs", () => {
  let musicPeak = 0;
  for (const id of ["title", "courtyard", "boss"]) {
    musicPeak = Math.max(musicPeak, peak(rendered[id].left), peak(rendered[id].right));
  }
  for (const name of Object.keys(SFX)) {
    const p = Math.max(peak(sfxRendered[name].left), peak(sfxRendered[name].right));
    assert.ok(p > 0.01, `${name} silent`);
    assert.ok(p < musicPeak * 0.55, `${name} peak ${p} vs music ${musicPeak}`);
  }
});

test("the effects reel is 30 to 45 seconds and includes every listed cue", () => {
  const plan = sfxReelPlan();
  assert.ok(plan.seconds >= 30 && plan.seconds <= 45, `reel ${plan.seconds}`);
  const names = plan.events.map((ev) => ev.name);
  for (const cue of SFX_REEL_CUES) assert.ok(names.includes(cue), cue);
  assert.deepEqual(names.slice(0, SFX_REEL_CUES.length), SFX_REEL_CUES);
  const reel = mixClips(
    names.map((name) => sfxRendered[name]),
    plan.events,
    plan.seconds,
    44100,
    0.4
  );
  const p = Math.max(peak(reel.left), peak(reel.right));
  assert.ok(p <= 0.4, `reel peak ${p}`);
  assert.ok(rms(reel.left) > 0.005);
});

test("new audio sources name no host, user, or local path", () => {
  const files = [
    "js/fern-synth.js",
    "js/fern-score.js",
    "js/fern-player.js",
    "tools/render-fern-previews.mjs",
    "docs/previews/audio/README.md",
  ];
  const banned = [/https?:\/\//i, /localhost/i, /\/Users\//, /\/home\//, /\/agent\//, /\/cursor\//, /davidcasas/i];
  for (const rel of files) {
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    for (const re of banned) assert.equal(re.test(text), false, `${rel} matches ${re}`);
  }
});

for (const id of ["title", "courtyard", "boss"]) {
  const clip = rendered[id];
  const kicks = TRACKS[id].channels.noise.filter((ev) => ev.drum === "kick").length;
  console.log(
    `  info  ${id} ${clip.seconds.toFixed(2)}s peak ${Math.max(peak(clip.left), peak(clip.right)).toFixed(2)} ` +
      `rms ${rms(clip.left).toFixed(3)} tri ${rms(clip.channels.triangle).toFixed(3)} ` +
      `lead ${rms(clip.channels.pulse1).toFixed(3)} kicks ${kicks}`
  );
}

const failed = results.filter((r) => !r.ok);
console.log(`\n=== Chiptune: ${results.length - failed.length}/${results.length} passed ===\n`);
if (failed.length) process.exitCode = 1;
