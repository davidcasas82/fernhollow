/**
 * Pixel sun-bolts. Drawn in code: there is no approved bolt sheet.
 * Ryan and every other character stay on the atlas path.
 * Positions passed to the canvas are integers. Smoothing stays off.
 */

/** Live spark pixels. 112 trail + 32 hand/hit bursts. */
export const BOLT_SPARK_CAP = 144;
export const BOLT_TRAIL_CAP = 112;
export const BOLT_BURST_CAP = 32;

/** Trail, muzzle, and puff sparks fade inside this window. */
export const SPARK_LIFE_MIN = 0.22;
export const SPARK_LIFE_MAX = 0.38;

const TRAIL_SPACING = 10;
const TRAIL_SPAWN_PER_STEP = 28;

const GOLD = "#f0d24a";
const GOLD_BRIGHT = "#ffe38a";
const WHITE = "#fff8ee";
const HOT = "#ffffff";
const AMBER = "#e07030";
const INK = "#1a1420";
const DEW = "#9ee7c4";
const DEW_HOT = "#d4fff0";

const SPARK_COLORS = [WHITE, GOLD, GOLD_BRIGHT, DEW, HOT];
const TRAIL_COLORS = [WHITE, HOT, DEW_HOT, DEW, GOLD_BRIGHT];

/** Tapered shaft. Local pixels, +x is forward, origin is the hit point. */
const SHAFT = [
  [-3, -1, 3, GOLD],
  [-2, -5, 8, GOLD],
  [-1, -8, 14, GOLD_BRIGHT],
  [0, -11, 20, GOLD_BRIGHT],
  [1, -8, 14, GOLD_BRIGHT],
  [2, -5, 8, GOLD],
  [3, -1, 3, GOLD],
];

/** Loose halo, not a filled box. */
const HALO = [
  [-8, -4],
  [-2, -5],
  [4, -5],
  [9, -3],
  [12, -1],
  [14, 0],
  [12, 1],
  [9, 3],
  [4, 5],
  [-2, 5],
  [-8, 4],
  [-12, 1],
  [-13, 0],
  [-12, -1],
  [0, -4],
  [6, 4],
  [-4, 4],
  [7, -4],
];

/** A few pixels hop while the bolt is in flight. */
const SHIMMER = [
  [
    [-6, -4, DEW_HOT],
    [3, 4, DEW],
    [5, -4, WHITE],
  ],
  [
    [-4, 4, DEW],
    [7, -4, DEW_HOT],
    [1, -4, WHITE],
  ],
  [
    [-9, 3, WHITE],
    [2, 4, DEW],
    [9, -3, DEW_HOT],
  ],
  [
    [-7, 4, DEW],
    [4, -4, WHITE],
    [-2, 4, DEW_HOT],
  ],
];

function sparkLife() {
  return SPARK_LIFE_MIN + Math.random() * (SPARK_LIFE_MAX - SPARK_LIFE_MIN);
}

function sparkColor() {
  return SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0];
}

export class BoltFx {
  constructor() {
    this.sparks = [];
    this.trailCount = 0;
    this.burstCount = 0;
    /** @type {WeakMap<object, number>} */
    this._carry = new WeakMap();
  }

  clear() {
    this.sparks.length = 0;
    this.trailCount = 0;
    this.burstCount = 0;
  }

  /** Small sparkle at the hand when a shot leaves. */
  sparkle(x, y) {
    this._burst(x, y, 8, false);
  }

  /** Soft pixel puff when a bolt hits or expires. */
  puff(x, y) {
    this._burst(x, y, 7, true);
  }

  /**
   * Age sparks and leave a trail behind living bolts.
   * @param {Array<{x:number,y:number,vx:number,vy:number,dead?:boolean}>|null} bullets
   */
  step(bullets, dt) {
    if (bullets && dt > 0) {
      let spawned = 0;
      for (const b of bullets) {
        if (!b || b.dead) continue;
        const dist = Math.hypot(b.vx || 0, b.vy || 0) * dt;
        let carry = (this._carry.get(b) || 0) + dist;
        while (
          carry >= TRAIL_SPACING &&
          spawned < TRAIL_SPAWN_PER_STEP &&
          this.trailCount < BOLT_TRAIL_CAP &&
          this.sparks.length < BOLT_SPARK_CAP
        ) {
          carry -= TRAIL_SPACING;
          this._trailSpark(b);
          spawned += 1;
        }
        if (carry > TRAIL_SPACING * 2) carry = TRAIL_SPACING * 2;
        this._carry.set(b, carry);
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      if (s.life <= 0) {
        this._dropSpark(i);
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.9;
      s.vy *= 0.9;
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array<{x:number,y:number,vx:number,vy:number,dead?:boolean}>|null} bullets
   */
  draw(ctx, bullets, t = 0) {
    if (!ctx) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = "source-over";

    for (const s of this.sparks) {
      const a = s.maxLife > 0 ? s.life / s.maxLife : 0;
      if (a <= 0.02) continue;
      const size = s.size === 2 ? 2 : 1;
      const x = Math.round(s.x) - (size > 1 ? 1 : 0);
      const y = Math.round(s.y) - (size > 1 ? 1 : 0);
      ctx.globalAlpha = s.soft ? a * 0.62 : a;
      ctx.fillStyle = s.color;
      ctx.fillRect(x, y, size, size);
    }

    if (bullets) {
      for (const b of bullets) {
        if (!b || b.dead) continue;
        this._drawBolt(ctx, b, t);
      }
    }

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
  }

  _burst(x, y, count, soft) {
    for (let i = 0; i < count; i++) {
      if (this.sparks.length >= BOLT_SPARK_CAP || this.burstCount >= BOLT_BURST_CAP) return;
      const ang = Math.random() * Math.PI * 2;
      const sp = soft ? 12 + Math.random() * 28 : 34 + Math.random() * 62;
      const life = sparkLife();
      this.sparks.push({
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life,
        maxLife: life,
        size: soft || Math.random() < 0.4 ? 2 : 1,
        color: sparkColor(),
        kind: "burst",
        soft,
      });
      this.burstCount += 1;
    }
  }

  _trailSpark(b) {
    const sp = Math.hypot(b.vx || 0, b.vy || 0) || 1;
    const bx = -(b.vx || 0) / sp;
    const by = -(b.vy || 0) / sp;
    const px = -by;
    const py = bx;
    const side = (Math.random() - 0.5) * 2;
    const life = sparkLife();
    const drift = 16 + Math.random() * 30;
    this.sparks.push({
      x: b.x + bx * (8 + Math.random() * 6) + px * side * 2,
      y: b.y + by * (8 + Math.random() * 6) + py * side * 2,
      vx: bx * (10 + Math.random() * 18) + px * side * drift,
      vy: by * (10 + Math.random() * 18) + py * side * drift,
      life,
      maxLife: life,
      size: Math.random() < 0.55 ? 2 : 1,
      color: TRAIL_COLORS[(Math.random() * TRAIL_COLORS.length) | 0],
      kind: "trail",
      soft: false,
    });
    this.trailCount += 1;
  }

  _dropSpark(index) {
    const s = this.sparks[index];
    if (s.kind === "trail") this.trailCount -= 1;
    else this.burstCount -= 1;
    const last = this.sparks.length - 1;
    if (index !== last) this.sparks[index] = this.sparks[last];
    this.sparks.pop();
  }

  _drawBolt(ctx, b, t) {
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    const ang = Math.atan2(b.vy || 0, b.vx || 0);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, y);
    ctx.rotate(ang);
    // 2x2 world pixels so the bolt reads at courtyard scale. Still integer, still crisp.
    const S = 2;
    const dot = (px, py, pw, ph) => ctx.fillRect(px * S, py * S, pw * S, ph * S);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = GOLD;
    for (const [px, py] of HALO) dot(px, py, 1, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = INK;
    dot(-12, -1, 1, 3);
    dot(13, 0, 1, 1);
    for (const [py, px, pw, color] of SHAFT) {
      ctx.fillStyle = color;
      dot(px, py, pw, 1);
    }
    ctx.fillStyle = AMBER;
    dot(-12, -1, 2, 3);
    dot(-13, 0, 1, 1);
    ctx.fillStyle = WHITE;
    dot(-5, -1, 10, 3);
    dot(9, -1, 3, 3);
    dot(12, 0, 2, 1);
    ctx.fillStyle = HOT;
    dot(-2, 0, 7, 1);
    ctx.fillStyle = DEW;
    dot(-6, -2, 1, 1);
    dot(4, 2, 1, 1);
    ctx.fillStyle = DEW_HOT;
    dot(6, -2, 1, 1);
    const phase = (Math.floor(t * 8) + ((x * 3 + y) & 3)) & 3;
    ctx.globalAlpha = 1;
    for (const pix of SHIMMER[phase]) {
      ctx.fillStyle = pix[2];
      dot(pix[0], pix[1], 1, 1);
    }
    ctx.restore();
  }
}
