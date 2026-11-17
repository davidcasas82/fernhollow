/**
 * Timing for atlas clips. Walk and idle stay on the base sheets.
 * Hurt, attack, and death play from the v3 extra sheets.
 * Hits also flash white and puff from fx.png.
 */

export const TIMING = {
  ryanStride: 16,
  hurtFlash: 0.1,
  hurtHold: 0.18,
  poofFps: 8,
  hitFps: 12,
  shockFps: 8,
  pickupBobPx: 3,
  pickupBobHz: 1.5,
  spawnRisePx: 14,
  attackStride: 0.6,
};

/** World pixels of travel per walk frame. Bigger bodies take a longer step. */
export const STRIDE = {
  ryan: TIMING.ryanStride,
  wanderer: 11,
  pink: 12,
  spinner: 12,
  splitter: 13,
  splitterChild: 10,
  tank: 14,
  pathBoss: 18,
  diamond: 10,
  snake: 10,
  void: 14,
  atom: 8,
};

const AIRBORNE = new Set(["diamond", "snake", "void", "atom"]);

export function isAirborne(type) {
  return AIRBORNE.has(type);
}

export function knock(entity, dx, dy, speed) {
  if (!entity || !(speed > 0)) return;
  const len = Math.hypot(dx, dy) || 1;
  entity.kx = (entity.kx || 0) + (dx / len) * speed;
  entity.ky = (entity.ky || 0) + (dy / len) * speed;
}

export function applyKnock(entity, dt) {
  const kx = entity?.kx || 0;
  const ky = entity?.ky || 0;
  if (kx === 0 && ky === 0) return;
  entity.x += kx * dt;
  entity.y += ky * dt;
  const k = Math.exp(-11 * dt);
  entity.kx = kx * k;
  entity.ky = ky * k;
  if (Math.hypot(entity.kx, entity.ky) < 12) {
    entity.kx = 0;
    entity.ky = 0;
  }
}

export function rememberPlace(entity) {
  if (!entity) return;
  entity._px = entity.x;
  entity._py = entity.y;
}

/** Record the step this frame took, then ease knockback. Feet advance only while walking. */
export function settleMotion(entity, dt) {
  if (!entity) return;
  const dx = entity.x - (entity._px ?? entity.x);
  const dy = entity.y - (entity._py ?? entity.y);
  const dist = Math.hypot(dx, dy);
  if (entity.flash > 0) entity.flash = Math.max(0, entity.flash - dt);
  if (entity.hurt > 0) entity.hurt = Math.max(0, entity.hurt - dt);
  else if (dist > 0.01) entity.step = (entity.step || 0) + dist;
  if (entity.type !== "snake" && Math.abs(dx) > 0.4) entity.flipX = dx < 0;
  entity.mx = dx;
  entity.my = dy;
  entity.flap = (entity.flap || 0) + dt;
  applyKnock(entity, dt);
}

export function strideFor(entity) {
  if (!entity) return 12;
  if (entity.pathBoss || entity.boss) return STRIDE.pathBoss;
  return STRIDE[entity.type] || 12;
}

function wrap(index, count) {
  const n = count > 0 ? count : 1;
  const i = index % n;
  return i < 0 ? i + n : i;
}

/**
 * Frame index inside the existing 4-frame sheet.
 * Idle plants frame 0. Walk advances by distance. Attack uses a shorter stride.
 * Hurt holds the pose that was on screen.
 */
export function enemyFrame(entity) {
  const n = 4;
  if (!entity) return 0;
  if ((entity.hurt || 0) > 0) return wrap(entity.holdFrame || 0, n);
  const stride = strideFor(entity);
  const step = (entity.step || 0) + (entity.phase || 0) * stride;
  if (isAirborne(entity.type)) {
    const moving = Math.hypot(entity.mx || 0, entity.my || 0) > 0.4;
    const fps = entity.dashing > 0 ? 10 : moving ? 8 : 3;
    return wrap(Math.floor(((entity.flap || 0) + (entity.phase || 0)) * fps), n);
  }
  const attacking =
    (entity.type === "pink" || entity.type === "tank") &&
    ((entity.dashing || 0) > 0 || (entity.coiling || 0) > 0);
  if (attacking) return wrap(Math.floor(step / (stride * TIMING.attackStride)), n);
  if (Math.hypot(entity.mx || 0, entity.my || 0) > 0.35) {
    return wrap(Math.floor(step / stride), n);
  }
  return 0;
}

export function ryanWalkIndex(player) {
  const step = player?.step || 0;
  return wrap(Math.floor(step / TIMING.ryanStride), 4);
}

export function flashAlpha(time) {
  if (!(time > 0)) return 0;
  return Math.max(0, Math.min(1, time / TIMING.hurtFlash));
}

/** Ease-out rise. enter 1 sits on the feet anchor. */
export function spawnPose(enter) {
  const t = enter == null ? 1 : Math.max(0, Math.min(1, enter));
  const eased = 1 - (1 - t) ** 3;
  const alpha = t <= 0 ? 0 : Math.max(0.15, eased);
  return {
    dy: Math.round((1 - eased) * TIMING.spawnRisePx),
    alpha: t >= 1 ? 1 : alpha,
  };
}

export function pickupBob(time, x) {
  const wave = Math.sin((time || 0) * Math.PI * 2 * TIMING.pickupBobHz + (x || 0) * 0.02);
  return Math.round(wave * TIMING.pickupBobPx);
}

export const FX_FPS = {
  poof: TIMING.poofFps,
  hit: TIMING.hitFps,
  shockwave: TIMING.shockFps,
};

export function fxOnceIndex(frameCount, kind, age) {
  const fps = FX_FPS[kind];
  if (!fps || !(frameCount > 0)) return null;
  const i = Math.floor((age || 0) * fps);
  return Math.max(0, Math.min(frameCount - 1, i));
}

export function fxLife(kind) {
  if (kind === "hit") return 3 / TIMING.hitFps + 0.04;
  if (kind === "poof" || kind === "shockwave") return 4 / TIMING.poofFps + 0.05;
  return 0.55;
}
