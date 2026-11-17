/**
 * Fernhollow music and effects.
 * Title, courtyard, and boss loops, plus the quieter cues, all synthesized
 * from the score. There is no recorded bed.
 */

import { BGM_VOLUME } from "./constants.js";
import { fernBattleId } from "./fern-score.js";
import { FernPlayer } from "./fern-player.js";

export class AudioBus {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.bgmVolume = BGM_VOLUME;
    this.chiptune = new FernPlayer(this);
  }

  ensure() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.pauseBgm();
    else this.resumeBgm();
    return this.enabled;
  }

  shoot(mult = 1) {
    this.chiptune.sfx("shoot", { rate: 1 + Math.min(0.18, Math.max(0, mult - 1) * 0.003) });
  }

  enemyHit() {
    this.chiptune.sfx("hit");
  }

  enemyDeath(pitch = 1) {
    this.chiptune.sfx("enemyDeath", { rate: Math.max(0.85, Math.min(1.35, pitch || 1)) });
  }

  playerHit() {
    this.chiptune.sfx("hurt");
  }

  gameOver() {
    this.chiptune.sfx("gameOver");
    this.fadeOutBgm(1.2);
  }

  start() {
    this.chiptune.sfx("start");
  }

  splashDismiss() {
    this.chiptune.sfx("splash");
  }

  levelUp() {
    this.chiptune.sfx("levelUp");
  }

  geom(mult = 1) {
    this.chiptune.sfx("pickup", { rate: 1 + Math.min(0.12, Math.max(0, mult - 1) * 0.002) });
  }

  bomb() {
    this.chiptune.sfx("bomb");
  }

  extraLife() {
    this.chiptune.sfx("extraLife");
  }

  extraBomb() {
    this.chiptune.sfx("extraBomb");
  }

  /** Title loop. */
  playMenuTheme() {
    this.chiptune.play("title", { restart: false });
  }

  menuMove() {
    this.chiptune.sfx("menuMove");
  }

  menuSelect() {
    this.chiptune.sfx("menuSelect");
  }

  /** Sting when a boss steps in. The boss loop is selected by playTheme. */
  bossIntro() {
    this.chiptune.sfx("bossIntro");
  }

  /**
   * Boss stages use the boss loop. Every other fight uses the courtyard loop.
   * @param {{ id?: string } | null | undefined} theme
   */
  playTheme(theme, { restart = true } = {}) {
    this.chiptune.play(fernBattleId(theme), { restart });
  }

  playLevelTheme(_level, { restart = false } = {}) {
    this.chiptune.play("courtyard", { restart });
  }

  stopBgm() {
    this.chiptune.stop();
  }

  pauseBgm() {
    this.chiptune.pause();
  }

  resumeBgm() {
    if (!this.enabled) return;
    this.chiptune.resume();
  }

  fadeOutBgm(seconds = 1) {
    this.chiptune.fadeOut(seconds);
  }
}
