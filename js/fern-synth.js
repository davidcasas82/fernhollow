/**
 * Sample-accurate pulse, triangle, and noise synth.
 * Scores are note lists. This file only turns them into samples.
 */

const NOISE_PERIODS = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068];
const CPU_CLOCK = 1789773;

function midiHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function polyBlep(t, dt) {
  if (dt <= 0) return 0;
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

function pulseWave(phase, dt, duty) {
  const d = duty < 0.05 ? 0.05 : duty > 0.75 ? 0.75 : duty;
  let v = phase < d ? 1 : -1;
  v += polyBlep(phase, dt);
  let edge = phase - d;
  if (edge < 0) edge += 1;
  v -= polyBlep(edge, dt);
  return v;
}

function triangleWave(phase) {
  const s = Math.floor(phase * 32) | 0;
  const q = s < 16 ? s : 31 - s;
  return (q / 15) * 2 - 1;
}

function noisePeriod(index) {
  const i = index < 0 ? 0 : index > 15 ? 15 : index;
  const i0 = i | 0;
  const i1 = i0 < 15 ? i0 + 1 : 15;
  const f = i - i0;
  return NOISE_PERIODS[i0] * (1 - f) + NOISE_PERIODS[i1] * f;
}

function envGain(pos, dur, attack, release) {
  const a = attack < dur * 0.45 ? attack : dur * 0.45;
  const r = release < dur * 0.5 ? release : dur * 0.5;
  if (pos < a) return a > 0 ? pos / a : 1;
  if (pos > dur - r) return r > 0 ? Math.max(0, (dur - pos) / r) : 0;
  return 1;
}

function renderChannel(events, frames, sampleRate, bpm, spec) {
  const out = new Float32Array(frames);
  const secPerBeat = 60 / bpm;
  const sorted = events;
  const fc = spec.fc || 5000;
  const lpC = 1 - Math.exp((-2 * Math.PI * fc) / sampleRate);
  let ei = 0;
  let phase = 0;
  let lfsr = 1;
  let noiseTimer = 0;
  let lp = 0;
  let active = null;

  for (let i = 0; i < frames; i++) {
    const beat = i / sampleRate / secPerBeat;
    while (ei < sorted.length && sorted[ei].beat + sorted[ei].len <= beat) ei += 1;
    const ev = ei < sorted.length ? sorted[ei] : null;
    const on = ev && beat >= ev.beat;
    if (!on) {
      lp += (0 - lp) * lpC;
      out[i] = lp;
      active = null;
      continue;
    }
    if (active !== ev) {
      active = ev;
      if (spec.kind === "noise") {
        lfsr = 1;
        noiseTimer = 0;
      }
    }
    const posBeat = beat - ev.beat;
    const posSec = posBeat * secPerBeat;
    const durSec = ev.len * secPerBeat;
    const u = durSec > 0 ? posSec / durSec : 1;
    let amp = ((ev.vol ?? 12) / 15) * envGain(posSec, durSec, spec.attack, spec.release);
    if (spec.decay) amp *= Math.exp(-posSec * spec.decay);

    let sample = 0;
    if (spec.kind === "noise") {
      let idx = ev.noise ?? 8;
      if (ev.slideNoise != null) idx += (ev.slideNoise - idx) * u;
      const period = Math.max(2, noisePeriod(idx));
      noiseTimer += CPU_CLOCK / sampleRate;
      const tap = ev.mode === "short" ? 6 : 1;
      while (noiseTimer >= period) {
        noiseTimer -= period;
        const feedback = (lfsr ^ (lfsr >>> tap)) & 1;
        lfsr = ((lfsr >>> 1) | (feedback << 14)) & 0x7fff;
      }
      sample = lfsr & 1 ? 1 : -1;
    } else {
      let midi = ev.midi ?? 60;
      if (ev.slideTo != null) midi += (ev.slideTo - (ev.midi ?? midi)) * u;
      let hz = midiHz(midi);
      if (spec.vibDepth && posSec > (spec.vibDelay || 0)) {
        const vt = posSec - (spec.vibDelay || 0);
        hz *= 1 + Math.sin(2 * Math.PI * (spec.vibRate || 5) * vt) * spec.vibDepth;
      }
      if (hz < 20) hz = 20;
      if (hz > 7900) hz = 7900;
      const dt = hz / sampleRate;
      phase += dt;
      if (phase >= 1) phase -= 1;
      if (spec.kind === "triangle") {
        sample = triangleWave(phase);
      } else {
        let duty = spec.duty ?? 0.5;
        if (spec.dutyLfo) {
          duty += Math.sin(2 * Math.PI * spec.dutyLfo.rate * (i / sampleRate)) * spec.dutyLfo.depth;
        }
        sample = pulseWave(phase, dt, duty);
      }
    }
    lp += (sample * amp - lp) * lpC;
    out[i] = lp;
  }
  return out;
}

function dcBlock(buf, sampleRate) {
  const r = 1 - (2 * Math.PI * 18) / sampleRate;
  let x1 = 0;
  let y1 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i];
    const y = x - x1 + r * y1;
    buf[i] = y;
    x1 = x;
    y1 = y;
  }
}

function peakOf(left, right) {
  let peak = 0;
  for (let i = 0; i < left.length; i++) {
    const a = left[i] < 0 ? -left[i] : left[i];
    const b = right[i] < 0 ? -right[i] : right[i];
    if (a > peak) peak = a;
    if (b > peak) peak = b;
  }
  return peak;
}

function scaleBuffers(left, right, gain) {
  for (let i = 0; i < left.length; i++) {
    left[i] *= gain;
    right[i] *= gain;
  }
}

function fadeTail(left, right, sampleRate, ms) {
  const n = Math.max(1, Math.floor((ms / 1000) * sampleRate));
  const start = left.length - n;
  if (start < 0) return;
  for (let i = 0; i < n; i++) {
    const g = 1 - i / n;
    left[start + i] *= g;
    right[start + i] *= g;
  }
}

/**
 * @param {object} score
 * @param {number} [sampleRate]
 */
export function renderScore(score, sampleRate = 44100) {
  const seconds = score.seconds ?? (score.bars * 4 * 60) / score.bpm;
  const frames = Math.max(1, Math.round(seconds * sampleRate));
  const mix = score.mix;
  const voice = score.voice;
  const channels = {
    pulse1: renderChannel(score.channels.pulse1 || [], frames, sampleRate, score.bpm, voice.pulse1),
    pulse2: renderChannel(score.channels.pulse2 || [], frames, sampleRate, score.bpm, voice.pulse2),
    triangle: renderChannel(score.channels.triangle || [], frames, sampleRate, score.bpm, voice.triangle),
    noise: renderChannel(score.channels.noise || [], frames, sampleRate, score.bpm, voice.noise),
  };
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  const width = score.width ?? 0.2;
  const drive = score.drive ?? 1;
  for (let i = 0; i < frames; i++) {
    const p1 = channels.pulse1[i] * mix.pulse1;
    const p2 = channels.pulse2[i] * mix.pulse2;
    const tr = channels.triangle[i] * mix.triangle;
    const nz = channels.noise[i] * mix.noise;
    const mid = p1 + p2 + tr + nz;
    const side = (p1 - p2) * width;
    left[i] = Math.tanh((mid + side) * drive);
    right[i] = Math.tanh((mid - side) * drive);
  }
  dcBlock(left, sampleRate);
  dcBlock(right, sampleRate);
  const peak = peakOf(left, right);
  if (score.normalize !== false && peak > 1e-8) {
    scaleBuffers(left, right, (score.peak ?? 0.88) / peak);
  } else if (score.peak && peak > score.peak) {
    scaleBuffers(left, right, score.peak / peak);
  }
  if (score.loopFade) fadeTail(left, right, sampleRate, score.loopFade);
  return { left, right, sampleRate, seconds: frames / sampleRate, channels, peak: peakOf(left, right) };
}

/**
 * Place non-overlapping clips into one buffer. Does not boost quiet clips.
 * @param {{ left: Float32Array, right: Float32Array, sampleRate: number }[]} clips
 * @param {{ t: number }[]} plan
 * @param {number} seconds
 * @param {number} ceiling
 */
export function mixClips(clips, plan, seconds, sampleRate, ceiling) {
  const frames = Math.max(1, Math.round(seconds * sampleRate));
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  for (let k = 0; k < plan.length; k++) {
    const clip = clips[k];
    const start = Math.floor(plan[k].t * sampleRate);
    const n = Math.min(clip.left.length, frames - start);
    for (let i = 0; i < n; i++) {
      left[start + i] += clip.left[i];
      right[start + i] += clip.right[i];
    }
  }
  const peak = peakOf(left, right);
  if (ceiling && peak > ceiling) scaleBuffers(left, right, ceiling / peak);
  return { left, right, sampleRate, seconds: frames / sampleRate, peak: peakOf(left, right) };
}
