import {
  COLORS,
  GEOM_FADE_SEC,
  GEOM_LIFE,
  GFX,
  GRID_STEP,
  HOVER_HEIGHT,
  SHADOW_OX,
  SHADOW_OY,
  WORLD_H,
  WORLD_W,
} from "./constants.js";
import { snakeSegments } from "./entities.js";
import { bloom, colorWithAlpha, neonStroke } from "./fx.js";
import { artBook, drawClip, drawFrame, facing4 } from "./art.js";
import { enemyFrame, flashAlpha, pickupBob, spawnPose, fxOnceIndex, ryanWalkIndex } from "./motion.js";
import { drawText, textWidth } from "./pixel-text.js";

/** Enemy still in red-outline telegraph phase (no solid fill / no collision). */
export function enemyIsOutline(e) {
  const enter = e?.enter != null ? e.enter : 1;
  return enter < (GFX.ENEMY_OUTLINE_END ?? 0.58);
}

/**
 * Quiet paper wash behind the grid. Decorative only.
 */
function drawPsychedelicUnderlay(ctx, W, H, t = 0) {
  const reduced = !!GFX.REDUCED_FLASH;
  const baseA = reduced
    ? GFX.UNDERLAY_ALPHA_REDUCED ?? 0.035
    : GFX.UNDERLAY_ALPHA ?? 0.09;
  if (baseA <= 0.001) return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Quiet multi-hue accent — floor stays dark so entities keep contrast
  const cx = W * 0.5 + Math.sin(t * 0.14) * W * 0.1;
  const cy = H * 0.5 + Math.cos(t * 0.11) * H * 0.08;
  const rMax = Math.hypot(W, H) * 0.55;

  const g1 = ctx.createRadialGradient(cx, cy, 30, cx, cy, rMax);
  g1.addColorStop(0, `rgba(255, 244, 220, ${baseA * 0.55})`);
  g1.addColorStop(0.5, `rgba(47, 211, 154, ${baseA * 0.22})`);
  g1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g3 = ctx.createRadialGradient(W * 0.12, H * 0.18, 0, W * 0.12, H * 0.18, W * 0.3);
  g3.addColorStop(0, `rgba(255, 77, 77, ${baseA * 0.28})`);
  g3.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g3;
  ctx.fillRect(0, 0, W, H);
  const g4 = ctx.createRadialGradient(W * 0.88, H * 0.82, 0, W * 0.88, H * 0.82, W * 0.32);
  g4.addColorStop(0, `rgba(255, 210, 58, ${baseA * 0.22})`);
  g4.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g4;
  ctx.fillRect(0, 0, W, H);

  ctx.restore();
}

/**
 * Floor environment: ink wash + hairline paper grid.
 * Shapes are drawn later with shadows so they read as hovering above this floor.
 * @param {number} [pulse=0.5] techno breath 0..1 (modulates major beams)
 */
export function drawGrid(
  ctx,
  shakeX = 0,
  shakeY = 0,
  impulses = [],
  t = 0,
  worldW = WORLD_W,
  worldH = WORLD_H,
  pulse = 0.5
) {
  const W = worldW || WORLD_W;
  const H = worldH || WORLD_H;
  const fancy = GFX.FANCY_GRID !== false;
  const stepMul = Math.max(1, GFX.GRID_STEP_MUL || 1);
  const step = Math.max(24, Math.round(GRID_STEP * stepMul));
  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Deep void under the arena
  ctx.fillStyle = COLORS.bgDeep;
  ctx.fillRect(-8, -8, W + 16, H + 16);

  // Floor plate — solid fill on low; gradient on high
  if (fancy) {
    const floor = ctx.createLinearGradient(0, 0, 0, H);
    floor.addColorStop(0, "rgba(18, 16, 28, 0.98)");
    floor.addColorStop(0.5, "rgba(12, 10, 20, 0.99)");
    floor.addColorStop(1, "rgba(7, 6, 13, 1)");
    ctx.fillStyle = floor;
  } else {
    ctx.fillStyle = "rgba(12, 10, 20, 1)";
  }
  ctx.fillRect(0, 0, W, H);

  if (fancy) {
    // Quiet multi-hue accent under the grid (not a full wash)
    drawPsychedelicUnderlay(ctx, W, H, t);

    // Soft stage light — mostly dark edges, cool center
    const vg = ctx.createRadialGradient(
      W / 2,
      H / 2,
      50,
      W / 2,
      H / 2,
      W * 0.7
    );
    vg.addColorStop(0, "rgba(255, 244, 220, 0.05)");
    vg.addColorStop(0.55, "rgba(18, 16, 28, 0.08)");
    vg.addColorStop(1, "rgba(0, 0, 0, 0.38)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  const pulseAmt = Math.max(0, Math.min(1, pulse));
  const majorBoost = 1 + (pulseAmt - 0.5) * 2 * (GFX.GRID_PULSE_DEPTH || 0.22);

  // Low quality: axis-aligned straight lines (no per-vertex warp / shimmer)
  if (!fancy) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.grid;
    ctx.beginPath();
    for (let x = 0; x <= W; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = 0; y <= H; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    // Sparse major beams (single path batch)
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = COLORS.gridMajor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const major = step * 4;
    for (let x = 0; x <= W; x += major) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = 0; y <= H; y += major) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
    ctx.restore();

    // Simple rim
    ctx.strokeStyle = "rgba(18, 16, 28, 0.85)";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, W - 4, H - 4);

    // Cheap impulse dots (no radial bloom gradients)
    if (impulses.length) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const imp of impulses) {
        const a = (imp.life / imp.maxLife) * 0.35 * imp.strength;
        ctx.fillStyle = colorWithAlpha(COLORS.gridGlow, a);
        ctx.beginPath();
        ctx.arc(imp.x, imp.y, 18 + imp.strength * 10, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
    return;
  }

  function warp(px, py) {
    let ox = 0;
    let oy = 0;
    for (const imp of impulses) {
      const dx = px - imp.x;
      const dy = py - imp.y;
      const d = Math.hypot(dx, dy) + 6;
      const fall = (imp.life / imp.maxLife) * imp.strength;
      const push = (fall * 4200) / (d * d);
      ox += (dx / d) * push;
      oy += (dy / d) * push;
    }
    const shimmer = Math.sin(px * 0.02 + t * 1.5) * Math.cos(py * 0.02 - t) * 0.85;
    return {
      x: px + Math.max(-58, Math.min(58, ox)) + shimmer,
      y: py + Math.max(-58, Math.min(58, oy)),
    };
  }

  // Impulse ripples on the floor (ink, not neon bloom)
  ctx.globalCompositeOperation = "source-over";
  for (const imp of impulses) {
    const a = (imp.life / imp.maxLife) * 0.35 * imp.strength;
    ctx.beginPath();
    ctx.arc(imp.x, imp.y, 28 + imp.strength * 22, 0, Math.PI * 2);
    ctx.strokeStyle = colorWithAlpha(COLORS.gridMajor, a);
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Secondary “under-grid” (slightly dimmer, offset) — sells floor thickness
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(18, 16, 28, 0.55)";
  ctx.translate(2, 3);
  for (let x = 0; x <= W; x += step * 2) {
    ctx.beginPath();
    for (let y = 0; y <= H; y += step) {
      const p = warp(x, y);
      if (y === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += step * 2) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += step) {
      const p = warp(x, y);
      if (x === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Primary floor grid
  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.grid;
  for (let x = 0; x <= W; x += step) {
    ctx.beginPath();
    for (let y = 0; y <= H; y += step) {
      const p = warp(x, y);
      if (y === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += step) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += step) {
      const p = warp(x, y);
      if (x === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  // Major floor beams — techno breath modulates alpha/width
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = Math.max(0.35, Math.min(1, majorBoost));
  ctx.strokeStyle = COLORS.gridMajor;
  ctx.lineWidth = 1.55 + pulseAmt * 0.55;
  for (let x = 0; x <= W; x += step * 5) {
    ctx.beginPath();
    for (let y = 0; y <= H; y += step) {
      const p = warp(x, y);
      if (y === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += step * 5) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += step) {
      const p = warp(x, y);
      if (x === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Arena rim — floor edge / trench wall (slight pulse)
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = COLORS.ink || "#12101c";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);
  ctx.strokeStyle = colorWithAlpha(COLORS.paper || "#fff4dc", 0.28);
  ctx.lineWidth = 1.4;
  ctx.strokeRect(6, 6, W - 12, H - 12);
  ctx.restore();

  // Thin atmospheric haze above the floor (separates air from ground)
  const haze = ctx.createLinearGradient(0, 0, 0, H);
  haze.addColorStop(0, "rgba(0, 0, 0, 0.12)");
  haze.addColorStop(0.5, "rgba(18, 16, 28, 0.04)");
  haze.addColorStop(1, "rgba(0, 0, 0, 0.18)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, W, H);

  ctx.restore();
}

/**
 * Soft ground contact blob — light cast on the floor under a hovering shape.
 */
export function drawFloorContact(ctx, x, y, radius, color, alpha = 0.22) {
  const fx = x + SHADOW_OX * 0.3;
  const fy = y + SHADOW_OY * 0.35;
  ctx.save();
  ctx.translate(fx, fy);
  ctx.scale(1.25, 0.48);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  g.addColorStop(0, colorWithAlpha(color, alpha));
  g.addColorStop(0.55, colorWithAlpha(color, alpha * 0.25));
  g.addColorStop(1, colorWithAlpha(color, 0));
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Drop shadow on the floor plane (oval, offset — light from upper-left).
 */
export function drawFloorShadow(ctx, x, y, radius, alpha = 0.45) {
  const fx = x + SHADOW_OX;
  const fy = y + SHADOW_OY;
  ctx.save();
  ctx.translate(fx, fy);
  ctx.scale(1.35, 0.42);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  g.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
  g.addColorStop(0.55, `rgba(0, 0, 0, ${alpha * 0.4})`);
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Floor pass: all shadows + contact lights under entities (drawn before hover layer).
 */
export function drawFloorShadows(ctx, player, enemies, geoms, t = 0) {
  const mode = GFX.FLOOR_SHADOWS || "all";
  if (mode === "none") return;

  // Player
  if (player) {
    drawFloorShadow(ctx, player.x, player.y, player.r * 2.8, 0.5);
    if (mode === "all") {
      drawFloorContact(ctx, player.x, player.y, player.r * 3.2, COLORS.player, 0.2);
    }
  }
  if (mode === "player") return;

  // Enemies — skip / dim shadows during outline telegraph
  for (const e of enemies) {
    if (e.dead) continue;
    if (enemyIsOutline(e)) {
      // Faint danger contact only — no solid floor shadow yet
      drawFloorContact(ctx, e.x, e.y, e.r * 2.4, COLORS.danger, 0.08);
      continue;
    }
    if (e.type === "snake") {
      for (const s of snakeSegments(e)) {
        drawFloorShadow(ctx, s.x, s.y, (s.r || e.r) * 2.2, 0.38);
      }
      drawFloorContact(ctx, e.x, e.y, e.r * 2.6, e.color, 0.14);
      continue;
    }
    const enter = e.enter != null ? e.enter : 1;
    const shadowR = e.type === "void" ? e.r * 3.6 : e.r * 2.5;
    drawFloorShadow(ctx, e.x, e.y, shadowR, 0.4 * enter);
    drawFloorContact(ctx, e.x, e.y, e.r * 2.8, e.color, 0.16 * enter);
  }
  // Geoms — tiny floor blips (pickups, not threats)
  for (const g of geoms) {
    const pulse = 0.9 + 0.1 * Math.sin(t * 8 + g.x * 0.08);
    drawFloorShadow(ctx, g.x, g.y, g.r * 1.6 * pulse, 0.22);
    drawFloorContact(ctx, g.x, g.y, g.r * 2.2 * pulse, COLORS.geom, 0.12);
  }
}

/** World Y offset so sprites sit above their floor shadows. */
function hoverY(y, bob = 0) {
  return y - HOVER_HEIGHT - bob;
}

/** Motion-blur afterimages of the ship */
export function drawAfterimages() {}

function ryanPose(player, t) {
  const moving = Math.hypot(player.vx || 0, player.vy || 0) > 12;
  const shooting = (player.fireCd || 0) > 0;
  let dir = player.face || "down";
  if (player.deathAge == null) {
    if (shooting) dir = facing4(player.angle || 0);
    else if (moving) dir = facing4(Math.atan2(player.vy, player.vx));
  }
  player.face = dir;
  if (player.deathAge != null) return { dir, clip: `death_${dir}`, time: player.deathAge, index: null };
  if ((player.hurt || 0) > 0) return { dir, clip: `hurt_${dir}`, time: 0, index: null };
  // Moving keeps the walk cycle, including while fireCd is up. Aim still
  // chooses the facing above. The one-frame shoot pose is for standing still.
  if (moving) return { dir, clip: `walk_${dir}`, time: t, index: ryanWalkIndex(player) };
  if (shooting) return { dir, clip: `shoot_${dir}`, time: t, index: null };
  return { dir, clip: `idle_${dir}`, time: t, index: null };
}

export function drawPlayer(ctx, player, t = 0) {
  const sheet = artBook()?.sheets?.ryan;
  if (!ctx || !player || !sheet) return;
  const flashing = (player.flash || 0) > 0;
  if (player.deathAge == null && player.invuln > 0 && !flashing && Math.floor(player.invuln / 80) % 2 === 0) return;
  const pose = ryanPose(player, t);
  const opts = {};
  if (pose.index != null) opts.index = pose.index;
  const flash = flashAlpha(player.flash);
  if (flash > 0 && player.deathAge == null) opts.flash = flash;
  drawClip(ctx, sheet, pose.clip, pose.time, player.x, player.y, opts);
}

export function drawRyanDeaths(ctx, list) {
  const sheet = artBook()?.sheets?.ryan;
  if (!ctx || !sheet || !list) return;
  for (const ghost of list) {
    if (!ghost || ghost.age == null || ghost.age >= 0.54) continue;
    drawClip(ctx, sheet, `death_${ghost.dir || "down"}`, ghost.age, ghost.x, ghost.y);
  }
}

export function drawBullets(ctx, bullets, t = 0) {
  const sheet = artBook()?.sheets?.fx;
  if (!ctx || !sheet || !bullets) return;
  for (const b of bullets) {
    if (b.dead) continue;
    const ang = Math.atan2(b.vy || 0, b.vx || 0);
    drawClip(ctx, sheet, "bolt", t, b.x, b.y, { angle: ang });
  }
}

export function drawGeoms(ctx, geoms, t = 0) {
  const sheet = artBook()?.sheets?.fx;
  if (!ctx || !sheet || !geoms) return;
  for (const g of geoms) {
    const maxL = g.maxLife > 0 ? g.maxLife : GEOM_LIFE;
    const lifeFrac = Math.max(0, Math.min(1, g.life / maxL));
    let alpha = 1;
    if (g.life < GEOM_FADE_SEC) {
      const u = Math.max(0, g.life / GEOM_FADE_SEC);
      const blink = Math.floor(t * (10 + (1 - u) * 18)) % 2 === 0 ? 1 : 0.28;
      alpha = (0.25 + 0.75 * u) * blink;
    } else if (lifeFrac < 0.45) {
      alpha = 0.55 + 0.45 * ((lifeFrac - 0.2) / 0.25);
    }
    drawClip(ctx, sheet, "sunseed", t, g.x, g.y - pickupBob(t, g.x), { alpha });
  }
}

function sheetForEnemy(enemy) {
  const book = artBook();
  if (!book || !enemy) return null;
  const id =
    enemy.pathBoss || enemy.boss ? book.behavior.pathBoss : book.behavior[enemy.type];
  return book.sheets[id] || null;
}

function actorOpts(entity, index, extra = {}) {
  const pose = spawnPose(entity?.enter);
  const opts = { index, ...extra };
  if (pose.alpha < 1) opts.alpha = pose.alpha;
  const flash = flashAlpha(entity?.flash);
  if (flash > 0) opts.flash = flash;
  return { opts, pose };
}

function enemyPose(enemy, t) {
  if (enemy.deathAge != null) return { name: "death", time: enemy.deathAge, index: null };
  if ((enemy.hurt || 0) > 0) return { name: "hurt", time: 0, index: null };
  if ((enemy.dashing || 0) > 0 || (enemy.coiling || 0) > 0 || (enemy.attack || 0) > 0) {
    return { name: "attack", time: enemy.attackT || 0, index: null };
  }
  return { name: "idle", time: t, index: enemyFrame(enemy) };
}

function drawActor(ctx, sheet, enemy, x, y, t, extra = {}) {
  const pose = enemyPose(enemy, t);
  const { opts } = actorOpts(enemy, pose.index, extra);
  if (pose.index == null) delete opts.index;
  if (enemy.flipX && extra.angle == null) opts.flipX = true;
  drawClip(ctx, sheet, pose.name, pose.time, x, y, opts);
}

function drawWhip(ctx, enemy, t) {
  const book = artBook();
  const pose = spawnPose(enemy.deathAge != null ? 1 : enemy.enter);
  if (pose.alpha <= 0) return;
  const segs = snakeSegments(enemy);
  const segSheet = book.sheets[book.behavior.snakeSegment];
  const headSheet = book.sheets[book.behavior.snake];
  for (let i = segs.length - 1; i >= 1; i--) {
    const here = segs[i];
    const toward = segs[i - 1];
    const heading = Math.atan2(toward.y - here.y, toward.x - here.x);
    drawActor(ctx, segSheet, enemy, here.x, here.y + pose.dy, t, { angle: heading + Math.PI / 2 });
  }
  const head = segs[0];
  const neck = segs[1] || head;
  const heading = Math.atan2(head.y - neck.y, head.x - neck.x);
  drawActor(ctx, headSheet, enemy, head.x, head.y + pose.dy, t, { angle: heading + Math.PI / 2 });
}

export function drawEnemies(ctx, enemies, t = 0) {
  if (!ctx || !artBook() || !enemies) return;
  for (const e of enemies) {
    if (!e || (e.dead && e.deathAge == null)) continue;
    if (e.type === "snake") {
      drawWhip(ctx, e, t);
      continue;
    }
    const pose = spawnPose(e.deathAge != null ? 1 : e.enter);
    if (pose.alpha <= 0) continue;
    const sheet = sheetForEnemy(e);
    if (!sheet) continue;
    drawActor(ctx, sheet, e, e.x, e.y + pose.dy, t);
  }
}

/** Starburst row on fx.png. The sheet stays; these frames are not drawn. */
export const COMIC_FX_KINDS = new Set(["hit"]);

export function drawArtFx(ctx, list, t = 0) {
  const sheet = artBook()?.sheets?.fx;
  if (!ctx || !sheet || !list) return;
  for (const fx of list) {
    if (!fx || COMIC_FX_KINDS.has(fx.kind)) continue;
    const clip = sheet.clips?.[fx.kind];
    const once = clip ? fxOnceIndex(clip.frames.length, fx.kind, fx.age) : null;
    const opts = once == null ? {} : { index: once };
    drawClip(ctx, sheet, fx.kind, fx.age != null ? fx.age : t, fx.x, fx.y, opts);
  }
}

/** Rising hit numbers in the 5×7 pixel font. Not used by sprite draws. */
export function drawDamageNumbers(ctx, list) {
  if (!ctx || !list?.length) return;
  for (const n of list) {
    const life = n.life > 0 ? n.life : 0.7;
    const u = Math.max(0, Math.min(1, (n.age || 0) / life));
    if (u >= 1) continue;
    const rise = Math.round((1 - (1 - u) ** 2) * 28);
    const scale = 2;
    const label = String(n.text);
    const x = Math.round(n.x - textWidth(label, scale) / 2);
    const y = Math.round(n.y - rise);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = u < 0.72 ? 1 : (1 - u) / 0.28;
    drawText(ctx, label, x, y, scale, "#fff4dc", "#12101c");
    ctx.restore();
  }
}

export function drawHudIcons(ctx, lives, bombs) {
  const book = artBook();
  const sheet = book?.sheets?.fx;
  if (!ctx || !sheet) return;
  const worldW = book.world?.w || 1600;
  const nL = Math.max(0, lives | 0);
  const nB = Math.max(0, bombs | 0);
  for (let i = 0; i < nL; i++) drawFrame(ctx, sheet, "hud", 0, 36 + i * 22, 36);
  for (let i = 0; i < nB; i++) {
    drawFrame(ctx, sheet, "hud", 1, worldW - 36 - i * 22, 36);
  }
}


export function drawBombFlash(ctx, flash) {
  if (!flash || flash <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  const reduced = !!GFX.REDUCED_FLASH;
  const a = Math.min(1, flash) * (reduced ? 0.22 : 0.45);
  ctx.fillStyle = `rgba(255, 244, 220, ${a * 0.28})`;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  const g = ctx.createRadialGradient(
    WORLD_W / 2,
    WORLD_H / 2,
    10,
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_W * 0.75
  );
  g.addColorStop(0, `rgba(255,244,220,${a * 0.55})`);
  g.addColorStop(0.35, `rgba(255,210,58,${a * 0.22})`);
  g.addColorStop(1, "rgba(255,210,58,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.restore();
}

export function drawVignette(ctx) {
  const g = ctx.createRadialGradient(
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_H * 0.35,
    WORLD_W / 2,
    WORLD_H / 2,
    WORLD_W * 0.75
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
}

/** Path Cross Gates — pulsing rings. Next gate is brighter. */
export function drawCheckpoints(ctx, checkpoints, nextIndex, time = 0) {
  if (!checkpoints || !checkpoints.length) return;
  const t = time || 0;
  for (let i = 0; i < checkpoints.length; i++) {
    const cp = checkpoints[i];
    const zone = cp?.zone;
    if (!zone) continue;
    const done = i < nextIndex;
    const next = i === nextIndex;
    const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * (next ? 6 : 3) + i));
    const a = done ? 0.22 : next ? 0.55 + 0.35 * pulse : 0.28;
    const col = done ? COLORS.playerGlow : COLORS.danger;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.r || 70, 0, Math.PI * 2);
    ctx.strokeStyle = colorWithAlpha(col, a);
    ctx.lineWidth = next ? 3.4 : 1.8;
    ctx.setLineDash(done ? [4, 8] : [10, 8]);
    ctx.lineDashOffset = -t * (next ? 40 : 18);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, 4 + (next ? pulse * 3 : 0), 0, Math.PI * 2);
    ctx.fillStyle = colorWithAlpha(col, a);
    ctx.fill();
    if (cp.label && next) {
      ctx.font = "700 12px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = colorWithAlpha("#fff", 0.85);
      ctx.fillText(cp.label, zone.x, zone.y - (zone.r || 70) - 8);
    }
    ctx.restore();
  }
}

export function drawAimReticle(ctx, rx, ry, shipX, shipY) {
  const hy = hoverY(shipY);
  const hry = hoverY(ry, 2);
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = colorWithAlpha("#12101c", 0.5);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(shipX, hy);
  ctx.lineTo(rx, hry);
  ctx.stroke();
  ctx.strokeStyle = colorWithAlpha(COLORS.player, 0.7);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(shipX, hy);
  ctx.lineTo(rx, hry);
  ctx.stroke();

  bloom(ctx, rx, hry, 12, COLORS.player, 0.35);
  ctx.strokeStyle = "#12101c";
  const s = 8;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(rx - s, hry);
  ctx.lineTo(rx + s, hry);
  ctx.moveTo(rx, hry - s);
  ctx.lineTo(rx, hry + s);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rx, hry, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// re-export for any leftover imports
export { neonStroke };
