/**
 * Plays the Fernhollow score through an AudioContext the bus already owns.
 */

import { SFX, TRACKS } from "./fern-score.js";
import { renderScore } from "./fern-synth.js";

export class FernPlayer {
  /**
   * @param {{ ensure: () => AudioContext | null, enabled: boolean, bgmVolume: number, _silenceHtml?: () => void }} bus
   */
  constructor(bus) {
    this.bus = bus;
    this.musicGain = null;
    this.sfxGain = null;
    this.source = null;
    this.currentId = null;
    this.buffers = new Map();
    this.sfxBuffers = new Map();
    this.startedAt = 0;
    this.offset = 0;
    this.paused = false;
  }

  _ctx() {
    const ctx = this.bus.ensure();
    if (!ctx || this.musicGain) return ctx;
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = this.bus.bgmVolume;
    this.musicGain.connect(ctx.destination);
    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = 0.2;
    this.sfxGain.connect(ctx.destination);
    return ctx;
  }

  _buffer(ctx, cache, key, score) {
    let buf = cache.get(key);
    if (buf) return buf;
    const rendered = renderScore(score, ctx.sampleRate);
    buf = ctx.createBuffer(2, rendered.left.length, ctx.sampleRate);
    if (typeof buf.copyToChannel === "function") {
      buf.copyToChannel(rendered.left, 0);
      buf.copyToChannel(rendered.right, 1);
    } else {
      buf.getChannelData(0).set(rendered.left);
      buf.getChannelData(1).set(rendered.right);
    }
    cache.set(key, buf);
    return buf;
  }

  play(id, { restart = true } = {}) {
    if (!TRACKS[id]) return;
    if (!this.bus.enabled) {
      this.currentId = id;
      this.paused = true;
      this.offset = restart ? 0 : this.offset;
      return;
    }
    const ctx = this._ctx();
    if (!ctx) {
      this.currentId = id;
      this.paused = true;
      this.offset = restart ? 0 : this.offset;
      return;
    }
    if (this.currentId === id && this.source && !restart && !this.paused) return;
    const buf = this._buffer(ctx, this.buffers, id, TRACKS[id]);
    const offset = restart ? 0 : this.offset % buf.duration;
    this._start(ctx, buf, offset);
    this.currentId = id;
    this.paused = false;
  }

  _start(ctx, buffer, offset) {
    this._stopSource();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(this.musicGain);
    const now = ctx.currentTime;
    const g = this.musicGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(0, now);
    g.linearRampToValueAtTime(this.bus.bgmVolume, now + 0.35);
    const startAt = Math.max(0, Math.min(offset, Math.max(0, buffer.duration - 0.01)));
    src.start(now, startAt);
    this.source = src;
    this.startedAt = now;
    this.offset = startAt;
  }

  _stopSource() {
    if (!this.source) return;
    try {
      this.source.onended = null;
      this.source.stop();
    } catch {
      /* already stopped */
    }
    this.source = null;
  }

  pause() {
    const ctx = this._ctx();
    if (!this.source || !ctx) {
      this.paused = true;
      return;
    }
    const elapsed = Math.max(0, ctx.currentTime - this.startedAt);
    const dur = this.source.buffer?.duration || 1;
    this.offset = (this.offset + elapsed) % dur;
    this._stopSource();
    this.paused = true;
  }

  resume() {
    if (!this.bus.enabled || !this.currentId) return;
    if (this.source && !this.paused) return;
    const ctx = this._ctx();
    if (!ctx) return;
    const buf = this.buffers.get(this.currentId) || this._buffer(ctx, this.buffers, this.currentId, TRACKS[this.currentId]);
    this._start(ctx, buf, this.offset);
    this.paused = false;
  }

  stop() {
    this._stopSource();
    this.currentId = null;
    this.offset = 0;
    this.paused = false;
    const ctx = this.musicGain && this._ctx();
    if (ctx && this.musicGain) {
      const now = ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.bus.bgmVolume, now);
    }
  }

  fadeOut(seconds = 1) {
    const ctx = this._ctx();
    if (!ctx || !this.musicGain) return;
    const now = ctx.currentTime;
    const g = this.musicGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + seconds);
  }

  /**
   * @param {string} name
   * @param {{ rate?: number }} [opts]
   */
  sfx(name, opts = {}) {
    if (!this.bus.enabled || !SFX[name]) return;
    const ctx = this._ctx();
    if (!ctx) return;
    const buf = this._buffer(ctx, this.sfxBuffers, name, SFX[name]);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = opts.rate > 0 ? opts.rate : 1;
    src.connect(this.sfxGain);
    src.start();
  }
}
