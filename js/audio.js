/**
 * SFX (synth) + looping BGM tracks.
 * Classic: two Neon Swarm beds, lazy-loaded. This is what the game plays.
 * Path: playTheme(theme) probes a file, else classic fallback.
 * Fernhollow chiptune is wired and stays silent while FERN_CHIPTUNE is false.
 */

import { BGM_TRACKS, BGM_VOLUME, FERN_CHIPTUNE } from "./constants.js";
import { fernBattleId } from "./fern-score.js";
import { FernPlayer } from "./fern-player.js";

export class AudioBus {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.sfxGain = null;
    this.sfxComp = null;

    /** @type {string[]} */
    this.trackSrcs = BGM_TRACKS.slice();
    /** @type {(HTMLAudioElement|null)[]} lazy classic beds */
    this.tracks = [];
    /** @type {Map<string, HTMLAudioElement>} */
    this._themes = new Map();
    /** @type {Set<string>} */
    this._missing = new Set();
    this.bgmIndex = -1;
    /** @type {HTMLAudioElement|null} */
    this._activeEl = null;
    this.bgmVolume = BGM_VOLUME;
    this._fadeTimer = null;
    this._shootFlip = false;
    this._loggedMissing = new Set();
    /** Null while Neon Swarm is the default. */
    this.chiptune = FERN_CHIPTUNE ? new FernPlayer(this) : null;
  }

  _chiptuneSfx(name, opts) {
    if (!this.chiptune) return false;
    this.chiptune.sfx(name, opts);
    return true;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.72;
      if (typeof this.ctx.createDynamicsCompressor === "function") {
        this.sfxComp = this.ctx.createDynamicsCompressor();
        this.sfxComp.threshold.value = -20;
        this.sfxComp.knee.value = 10;
        this.sfxComp.ratio.value = 8;
        this.sfxComp.attack.value = 0.003;
        this.sfxComp.release.value = 0.12;
        this.sfxGain.connect(this.sfxComp);
        this.sfxComp.connect(this.ctx.destination);
      } else {
        this.sfxGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.pauseBgm();
      this._setAllBgmVolume(0);
    } else {
      this._setAllBgmVolume(this.bgmVolume);
      this.chiptune?.resume();
      if (this._activeEl) {
        this._activeEl.volume = this.bgmVolume;
        this._activeEl.play().catch(() => {});
      } else if (this.bgmIndex >= 0) {
        this._playIndex(this.bgmIndex, false);
      }
    }
    return this.enabled;
  }

  tone(freq, duration, type = "sine", gain = 0.08, slideTo = null) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo != null) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, slideTo),
        ctx.currentTime + duration
      );
    }
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(this.sfxGain || ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  shoot(mult = 1) {
    if (this._chiptuneSfx("shoot", { rate: 1 + Math.min(0.18, Math.max(0, mult - 1) * 0.003) })) return;
    const p = 1 + Math.min(0.35, (mult - 1) * 0.004);
    this.tone(1180 * p, 0.038, "square", 0.028, 420 * p);
    this.tone(240 * p, 0.03, "triangle", 0.014, 90);
  }

  enemyHit() {
    if (this._chiptuneSfx("hit")) return;
    this.tone(360, 0.05, "triangle", 0.035, 160);
  }

  enemyDeath(pitch = 1) {
    if (this._chiptuneSfx("enemyDeath", { rate: Math.max(0.85, Math.min(1.35, pitch || 1)) })) return;
    this.tone(220 * pitch, 0.14, "sawtooth", 0.05, 50);
    this.tone(520 * pitch, 0.1, "triangle", 0.035, 180);
    this.tone(900 * pitch, 0.06, "sine", 0.02, 200);
  }

  playerHit() {
    if (this._chiptuneSfx("hurt")) return;
    this.tone(140, 0.25, "sawtooth", 0.06, 40);
    this.tone(90, 0.3, "square", 0.035, 30);
  }

  gameOver() {
    if (this.chiptune) {
      this.chiptune.sfx("gameOver");
      this.fadeOutBgm(1.2);
      return;
    }
    this.tone(220, 0.35, "sawtooth", 0.05, 70);
    setTimeout(() => this.tone(160, 0.4, "triangle", 0.04, 50), 120);
    this.fadeOutBgm(1.2);
  }

  start() {
    if (this._chiptuneSfx("start")) return;
    [392, 523, 659].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.1, "triangle", 0.045), i * 60);
    });
  }

  splashDismiss() {
    if (this._chiptuneSfx("splash")) return;
    this.tone(220, 0.12, "sawtooth", 0.04, 80);
    this.tone(660, 0.1, "square", 0.035, 1320);
    setTimeout(() => this.tone(880, 0.14, "triangle", 0.04, 1760), 40);
    setTimeout(() => this.tone(1320, 0.18, "sine", 0.03, 2400), 90);
    setTimeout(() => this.tone(180, 0.28, "triangle", 0.025, 40), 50);
  }

  levelUp() {
    if (this._chiptuneSfx("levelUp")) return;
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.1, "square", 0.04), i * 55);
    });
  }

  geom(mult = 1) {
    if (this._chiptuneSfx("pickup", { rate: 1 + Math.min(0.12, Math.max(0, mult - 1) * 0.002) })) return;
    const p = 1 + Math.min(1.2, (mult - 1) * 0.012);
    this.tone(660 * p, 0.06, "sine", 0.045, 1200 * p);
    this.tone(990 * p, 0.05, "triangle", 0.025, 1400 * p);
  }

  bomb() {
    if (this._chiptuneSfx("bomb")) return;
    this.tone(60, 0.4, "sawtooth", 0.08, 25);
    this.tone(160, 0.3, "square", 0.05, 40);
    this.tone(320, 0.2, "triangle", 0.04, 80);
    setTimeout(() => this.tone(100, 0.25, "sawtooth", 0.05, 30), 50);
  }

  extraLife() {
    if (this._chiptuneSfx("extraLife")) return;
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.12, "triangle", 0.05), i * 70);
    });
  }

  extraBomb() {
    if (this._chiptuneSfx("extraBomb")) return;
    [392, 494, 587].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.1, "square", 0.035), i * 55);
    });
  }

  /** Title loop. No-op while the chiptune switch is off. */
  playMenuTheme() {
    this.chiptune?.play("title", { restart: false });
  }

  /** Short confirm / move ticks. No-op while the chiptune switch is off. */
  menuMove() {
    this.chiptune?.sfx("menuMove");
  }

  menuSelect() {
    this.chiptune?.sfx("menuSelect");
  }

  /** Sting when a boss steps in. The boss loop is selected by playTheme. */
  bossIntro() {
    this.chiptune?.sfx("bossIntro");
  }

  /**
   * Play a Path theme bed. Missing file → classic fallback 1|2.
   * With the chiptune switch on, boss-pulse maps to the boss loop and
   * every other bed maps to the courtyard loop.
   * @param {{ id?: string, src?: string, fallback?: 1|2 } | null | undefined} theme
   */
  playTheme(theme, { restart = true } = {}) {
    if (this.chiptune) {
      this.chiptune.play(fernBattleId(theme), { restart });
      return;
    }
    if (!theme) {
      this.playLevelTheme(1, { restart });
      return;
    }
    const fallback = theme.fallback === 2 ? 2 : 1;
    const src = theme.src;
    if (!src || this._missing.has(src)) {
      if (src) this._logMissing(src);
      this.playLevelTheme(fallback, { restart });
      return;
    }
    this.ensure();
    if (typeof Audio === "undefined") {
      this.playLevelTheme(fallback, { restart });
      return;
    }
    let el = this._themes.get(theme.id || src);
    if (!el) {
      el = new Audio(src);
      el.loop = true;
      el.preload = "metadata";
      el.volume = 0;
      el.addEventListener(
        "error",
        () => {
          this._missing.add(src);
          this._logMissing(src);
          this.playLevelTheme(fallback, { restart: false });
        },
        { once: true }
      );
      this._themes.set(theme.id || src, el);
    }
    this._crossfadeElement(el, restart);
  }

  playLevelTheme(level, { restart = false } = {}) {
    if (this.chiptune) {
      this.chiptune.play("courtyard", { restart });
      return;
    }
    if (!this.trackSrcs.length) return;
    this.ensure();
    const idx = (Math.max(1, level) - 1) % this.trackSrcs.length;
    const el = this._classicTrack(idx);
    if (!el) return;
    if (el === this._activeEl && !restart) {
      if (this.enabled) {
        el.volume = this.bgmVolume;
        el.play().catch(() => {});
      }
      this.bgmIndex = idx;
      return;
    }
    this._crossfadeElement(el, restart);
    this.bgmIndex = idx;
  }

  stopBgm() {
    this.chiptune?.stop();
    this._clearFade();
    this._forEachEl((t) => {
      try {
        t.pause();
        t.currentTime = 0;
        t.volume = 0;
      } catch {
        /* ignore */
      }
    });
    this.bgmIndex = -1;
    this._activeEl = null;
  }

  pauseBgm() {
    this.chiptune?.pause();
    this._forEachEl((t) => {
      try {
        t.pause();
      } catch {
        /* ignore */
      }
    });
  }

  resumeBgm() {
    if (!this.enabled) return;
    this.chiptune?.resume();
    this.ensure();
    const t = this._activeEl || this.tracks[this.bgmIndex];
    if (!t) return;
    t.volume = this.bgmVolume;
    t.play().catch(() => {});
  }

  fadeOutBgm(seconds = 1) {
    this.chiptune?.fadeOut(seconds);
    const t = this._activeEl || (this.bgmIndex >= 0 ? this.tracks[this.bgmIndex] : null);
    if (!t) return;
    this._animateVolume(t, t.volume, 0, seconds, () => {
      try {
        t.pause();
      } catch {
        /* ignore */
      }
    });
  }

  _silenceHtml() {
    this._forEachEl((t) => {
      try {
        t.pause();
        t.volume = 0;
      } catch {
        /* ignore */
      }
    });
    this._activeEl = null;
  }

  _classicTrack(idx) {
    if (typeof Audio === "undefined") return null;
    if (!this.tracks[idx]) {
      const src = this.trackSrcs[idx];
      if (!src) return null;
      const a = new Audio(src);
      a.loop = true;
      a.preload = "metadata";
      a.volume = 0;
      this.tracks[idx] = a;
    }
    return this.tracks[idx];
  }

  _forEachEl(fn) {
    for (const t of this.tracks) if (t) fn(t);
    for (const t of this._themes.values()) fn(t);
  }

  _setAllBgmVolume(v) {
    this._forEachEl((t) => {
      t.volume = v;
    });
  }

  _playIndex(idx, fromStart) {
    const t = this._classicTrack(idx);
    if (!t) return;
    this._crossfadeElement(t, fromStart);
    this.bgmIndex = idx;
  }

  _crossfadeElement(next, fromStart) {
    if (!next) return;
    this._clearFade();
    const prev = this._activeEl && this._activeEl !== next ? this._activeEl : null;

    if (fromStart) {
      try {
        next.currentTime = 0;
      } catch {
        /* ignore */
      }
    }

    this._forEachEl((t) => {
      if (t !== next && t !== prev) {
        try {
          t.pause();
          t.volume = 0;
        } catch {
          /* ignore */
        }
      }
    });

    this._activeEl = next;

    if (!this.enabled) {
      next.volume = 0;
      return;
    }

    next.volume = 0;
    next.play().catch(() => {});

    const dur = 0.9;
    if (prev) {
      this._animateVolume(prev, prev.volume, 0, dur, () => {
        try {
          prev.pause();
        } catch {
          /* ignore */
        }
      });
    }
    this._animateVolume(next, 0, this.bgmVolume, dur);
  }

  _logMissing(src) {
    if (this._loggedMissing.has(src)) return;
    this._loggedMissing.add(src);
    console.info("[arena:bgm-missing]", src);
  }

  _animateVolume(audio, from, to, seconds, onDone) {
    const steps = Math.max(8, Math.floor(seconds * 30));
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      const t = Math.min(1, i / steps);
      audio.volume = Math.max(0, Math.min(1, from + (to - from) * t));
      if (t >= 1) {
        clearInterval(id);
        if (this._fadeTimer === id) this._fadeTimer = null;
        onDone?.();
      }
    }, (seconds * 1000) / steps);
    this._fadeTimer = id;
  }

  _clearFade() {
    if (this._fadeTimer) {
      clearInterval(this._fadeTimer);
      this._fadeTimer = null;
    }
  }
}
