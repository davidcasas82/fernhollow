/**
 * Limited-palette 8-bit sprites for Ryan and the Siege of Fernhollow.
 * Collision radii are unchanged — these are draw-only.
 * One source pixel is PX world pixels, blitted with nearest-neighbor.
 */

import { GFX } from "./constants.js";
import { snakeSegments } from "./entities.js";

export const PX = 4;

/** Shared courtyard palette. Transparent cells use "." */
export const PAL = {
  K: "#1a1420",
  S: "#f2c7a0",
  H: "#8a5a32",
  D: "#5c3a22",
  L: "#c48a58",
  G: "#3d9a4a",
  g: "#246b32",
  R: "#d23b3b",
  B: "#2c4e9e",
  b: "#1c356e",
  W: "#f7f7f7",
  w: "#b7b7b7",
  Y: "#f0d24a",
  y: "#fff4b0",
  A: "#8b5a2b",
  a: "#5c3a18",
  P: "#7a3ad4",
  p: "#d2b0f4",
  M: "#6aaa55",
  m: "#3d6a32",
  F: "#f4a0c0",
  N: "#e07030",
  Q: "#f4e27a",
};

const cache = new Map();

function makeCanvas(w, h) {
  if (typeof document === "undefined" || !document.createElement) return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export function bake(rows, scale = PX) {
  const key = scale + "\n" + rows.join("\n");
  const hit = cache.get(key);
  if (hit) return hit;
  const h = rows.length;
  const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const canvas = makeCanvas(w * scale, h * scale);
  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const col = PAL[row[x]];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
  const sprite = {
    canvas,
    w: w * scale,
    h: h * scale,
    ax: (w * scale) / 2,
    ay: (h * scale) / 2,
    rows,
    scale,
  };
  cache.set(key, sprite);
  return sprite;
}

function tinted(sprite, rgba) {
  if (!sprite?.canvas) return sprite;
  const key = rgba;
  sprite._tints = sprite._tints || {};
  if (sprite._tints[key]) return sprite._tints[key];
  const c = makeCanvas(sprite.w, sprite.h);
  if (!c) return sprite;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(sprite.canvas, 0, 0);
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = rgba;
  g.fillRect(0, 0, sprite.w, sprite.h);
  const out = { canvas: c, w: sprite.w, h: sprite.h, ax: sprite.ax, ay: sprite.ay };
  sprite._tints[key] = out;
  return out;
}

export function blit(ctx, sprite, x, y, opts = {}) {
  if (!ctx || !sprite?.canvas) return;
  const flipX = !!opts.flipX;
  const alpha = opts.alpha == null ? 1 : opts.alpha;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y));
  if (flipX) ctx.scale(-1, 1);
  ctx.drawImage(sprite.canvas, Math.round(-sprite.ax), Math.round(-sprite.ay));
  ctx.restore();
}

function shadow(ctx, x, y, hw, hh) {
  ctx.save();
  ctx.fillStyle = "rgba(20, 16, 12, 0.35)";
  ctx.fillRect(Math.round(x - hw), Math.round(y + hh * 0.35), hw * 2, Math.max(PX, hh * 0.45));
  ctx.restore();
}

// ── Ryan (16×24). Four facings, idle + walk. Matches the sprite sheet:
// curly brown hair, green hoodie, red neckerchief, jeans, white sneakers.

const RYAN_DOWN = [
  "..KHHHHHHHHHK...",
  ".KHHHDHHHDHHHK..",
  "KHHHDDHHHHHDHHK.",
  "KHHHSSSSSSSSHHK.",
  "KHHSEKSSSSEKHHK.",
  ".KHSSEKSSSEKSHK.",
  ".KHSSSSSSSSSSHK.",
  "..KHSSSKKSSSHK..",
  "...KKRRRRRRKK...",
  "..KGGGGGGGGGGK..",
  ".KGGGGGggGGGGGK.",
  ".KGGGGGggGGGGGK.",
  ".KGGGGGGGGGGGGK.",
  ".KGGGggggggGGGK.",
  "..KGGGGGGGGGGK..",
  "...KBBBBBBBBK...",
  "..KBBBBBBBBBBK..",
  "..KBBBbbbbBBBK..",
  "..KBBB....BBBK..",
  "..KBB......BBK..",
  ".KWW........WWK.",
  "KWWW........WWWK",
  "KWWW........WWWK",
  ".KKK........KKK.",
];

const RYAN_DOWN_WALK = [
  "..KHHHHHHHHHK...",
  ".KHHHDHHHDHHHK..",
  "KHHHDDHHHHHDHHK.",
  "KHHHSSSSSSSSHHK.",
  "KHHSEKSSSSEKHHK.",
  ".KHSSEKSSSEKSHK.",
  ".KHSSSSSSSSSSHK.",
  "..KHSSSKKSSSHK..",
  "...KKRRRRRRKK...",
  "..KGGGGGGGGGGK..",
  ".KGGGGGggGGGGGK.",
  ".KGGGGGggGGGGGK.",
  ".KGGGGGGGGGGGGK.",
  ".KGGGggggggGGGK.",
  "..KGGGGGGGGGGK..",
  "...KBBBBBBBBK...",
  "..KBBBBBBBBBBK..",
  "..KBBBbbbbBBBK..",
  ".KBB......BBBK..",
  "KBB........BBK..",
  "KWW..........WWK",
  "KWW..........WWK",
  "KKK..........KKK",
  "................",
];

const RYAN_UP = [
  "..KHHHHHHHHHK...",
  ".KHHHHHHHHHHHHK.",
  "KHHHHHHHHHHHHHHK",
  "KHHHDHHHHHHHDHHK",
  "KHHHHHHHHHHHHHHK",
  ".KHHHHHHHHHHHHK.",
  ".KHHHHHHHHHHHHK.",
  "..KHHHHHHHHHHK..",
  "...KKRRRRRRKK...",
  "..KGGGGGGGGGGK..",
  ".KGGGGGGGGGGGGK.",
  ".KGGGGGGGGGGGGK.",
  ".KGGGGGGGGGGGGK.",
  ".KGGGggggggGGGK.",
  "..KGGGGGGGGGGK..",
  "...KBBBBBBBBK...",
  "..KBBBBBBBBBBK..",
  "..KBBBBBBBBBBBK.",
  "..KBBB....BBBK..",
  "..KBB......BBK..",
  ".KWW........WWK.",
  "KWWW........WWWK",
  "KWWW........WWWK",
  ".KKK........KKK.",
];

const RYAN_UP_WALK = [
  "..KHHHHHHHHHK...",
  ".KHHHHHHHHHHHHK.",
  "KHHHHHHHHHHHHHHK",
  "KHHHDHHHHHHHDHHK",
  "KHHHHHHHHHHHHHHK",
  ".KHHHHHHHHHHHHK.",
  ".KHHHHHHHHHHHHK.",
  "..KHHHHHHHHHHK..",
  "...KKRRRRRRKK...",
  "..KGGGGGGGGGGK..",
  ".KGGGGGGGGGGGGK.",
  ".KGGGGGGGGGGGGK.",
  ".KGGGGGGGGGGGGK.",
  ".KGGGggggggGGGK.",
  "..KGGGGGGGGGGK..",
  "...KBBBBBBBBK...",
  "..KBBBBBBBBBBK..",
  "..KBBB....BBBK..",
  ".KBB........BBK.",
  "KWW..........WWK",
  "KWW..........WWK",
  "KKK..........KKK",
  "................",
  "................",
];

const RYAN_SIDE = [
  "...KHHHHHHHK....",
  "..KHHHDHHHHHK...",
  ".KHHHDDHHHHHHK..",
  ".KHHHSSSSHHHHK..",
  ".KHHSEKSSSHHHK..",
  "..KHSSSSSSHHK...",
  "..KHSSKKSSHK....",
  "...KKRRRRKK.....",
  "..KGGGGGGGGK....",
  ".KGGGGGGGGGGK...",
  ".KGGGggGGGGGGK..",
  ".KGGGGGGGGGGGK..",
  ".KGGGggggGGGGK..",
  "..KGGGGGGGGGK...",
  "...KBBBBBBBK....",
  "..KBBBBBBBBBK...",
  "..KBBBbbBBBBK...",
  "..KBBB...BBBK...",
  "..KBB.....BBK...",
  ".KWW......WWK...",
  "KWWW......WWWK..",
  "KWWW......WWWK..",
  ".KKK......KKK...",
  "................",
];

const RYAN_SIDE_WALK = [
  "...KHHHHHHHK....",
  "..KHHHDHHHHHK...",
  ".KHHHDDHHHHHHK..",
  ".KHHHSSSSHHHHK..",
  ".KHHSEKSSSHHHK..",
  "..KHSSSSSSHHK...",
  "..KHSSKKSSHK....",
  "...KKRRRRKK.....",
  "..KGGGGGGGGK....",
  ".KGGGGGGGGGGK...",
  ".KGGGggGGGGGGK..",
  ".KGGGGGGGGGGGK..",
  ".KGGGggggGGGGK..",
  "..KGGGGGGGGGK...",
  "...KBBBBBBBK....",
  "..KBBBBBBBBBK...",
  "..KBB.....BBBK..",
  ".KBB.......BBK..",
  "KWW.........WWK.",
  "KWW.........WWK.",
  "KKK.........KKK.",
  "................",
  "................",
  "................",
];

/** Title-screen pose: front, one hand out, sunlight spark. */
const RYAN_CAST = [
  "......KHHHHHHHHHK...",
  ".....KHHHDHHHDHHHK..",
  "....KHHHDDHHHHHDHHK.",
  "....KHHHSSSSSSSSHHK.",
  "....KHHSEKSSSSEKHHK.",
  ".....KHSSEKSSSEKSHK.",
  ".....KHSSSSSSSSSSHK.",
  "yyK...KHSSSKKSSSHK..",
  "yKy....KKRRRRRRKK...",
  ".y....KGGGGGGGGGGK..",
  ".....KGGGGGggGGGGGK.",
  ".....KGGGGGggGGGGGK.",
  ".....KGGGGGGGGGGGGK.",
  ".....KGGGggggggGGGK.",
  "......KGGGGGGGGGGK..",
  ".......KBBBBBBBBK...",
  "......KBBBBBBBBBBK..",
  "......KBBBbbbbBBBK..",
  "......KBBB....BBBK..",
  "......KBB......BBK..",
  ".....KWW........WWK.",
  "....KWWW........WWWK",
  "....KWWW........WWWK",
  ".....KKK........KKK.",
];

const PUFFLING = [
  "...GG....GG..",
  "..GGG....GGG.",
  "..KKKKKKKKKK..",
  ".KGGGGGGGGGGK.",
  "KGGggggggggGGK",
  "KGGKKGGKKGGGGK",
  "KGGggggggggGGK",
  "KGGGwwwwggGGK.",
  ".KGGggggggGGK.",
  "..KGGGGGGGGK..",
  "...KKGGGGKK...",
  "....KK..KK....",
];

const JAY = [
  "....PPPP......",
  "...PPPPPP.....",
  "..KPPPPPPPK...",
  ".KPPKKPPKKPPK.",
  "KPPPPPPPPPPPKW",
  "KPPPPPPPPPPPKW",
  ".KPPPPPPPPPPK.",
  "..KPPPPPPPPK..",
  "...KPP..PPK...",
  "..KPPP..PPPK..",
  "...KK....KK...",
];

const HARE = [
  ".KK....KK....",
  "KGGK..KGGK...",
  "KGGGKKGGGGK..",
  ".KGGGGGGGGGK.",
  ".KGGKGGKGGGK.",
  ".KGGGGGGGGGK.",
  ".KGGGwwGGGGK.",
  "..KGGGGGGGK..",
  "...KGG..GGK..",
  "..KGG....GGK.",
  "..KK......KK.",
];

const HARE_CROUCH = [
  ".KK....KK....",
  "KGGK..KGGK...",
  "KGGGKKGGGGK..",
  ".KGGKGGKGGGK.",
  ".KGGGGGGGGGK.",
  ".KGGGwwGGGGK.",
  "..KGGGGGGGGK.",
  "..KGG....GGK.",
  ".KGG......GGK",
  ".KK........KK",
];

const ACORN_A = [
  "..WW......WW..",
  "...WW.KK.WW...",
  ".....KWWK.....",
  "....KAAAAK....",
  "...KAAAAAAK...",
  "..KAAAKKAAAK..",
  "..KAAAAAAAAK..",
  "..KAAAAAAAAK..",
  "...KAAAAAAK...",
  "....KAAAAK....",
  ".....KKKK.....",
];

const ACORN_B = [
  ".WW........WW.",
  "..WW..KK..WW..",
  ".....KWWK.....",
  "....KAAAAK....",
  "...KAAAAAAK...",
  "..KAAAKKAAAK..",
  "..KAAAAAAAAK..",
  "..KAAAAAAAAK..",
  "...KAAAAAAK...",
  "....KAAAAK....",
  ".....KKKK.....",
];

const SPROUT = [
  ".....KKK......",
  "....KGGGK.....",
  ".....KGK......",
  "...KKGGGGKK...",
  "..KGGGGGGGGGK.",
  ".KGGggggggggGK",
  "KGGgKGGKKGggGK",
  "KGGgggggggggGK",
  "KGGGwwwwgggGGK",
  ".KGGggggggggGK",
  "..KGGGGGGGGGK.",
  "...KKGGGGKK...",
  "....KGG..GGK..",
  "...KGG....GGK.",
];

const SPROUT_SM = [
  "..KKKK..",
  ".KGGGGK.",
  "KGGKKGGK",
  "KGGGGGGK",
  "KGGwwGGK",
  ".KGGGGK.",
  "..KGGK..",
  ".KG..GK.",
];

const TURTLE = [
  "....KKKKKKKK....",
  "..KKMMMMMMMMKK..",
  ".KMMMmMMmMMmMMK.",
  "KMMMMMMMMMMMMMMK",
  "KMMMKMMMMKMMMMMK",
  "KMMMMMMMMMMMMMMK",
  ".KMMMMMMMMMMMMK.",
  "..KKMMMMMMMMKK..",
  ".KGGK......KGGK.",
  "KGGGK......KGGGK",
  ".KKK........KKK.",
];

const BLOOM = [
  ".Y..Y..Y..Y.",
  "YYYYYYYYYYYY",
  "YNYNYNYNYNYN",
  "YYYYKFFKYYYY",
  "YYYKFFFFKYYY",
  "YYYYKWWKYYYY",
  ".YYYYKKYYYY.",
  "...KGGGGK...",
  "..KGGGGGGK..",
  ".KGG....GGK.",
  "..KK....KK..",
];

const POLLEN = [
  ".KKKKK.",
  "KYYYYYK",
  "KYKYYKY",
  "KYYYYYK",
  "KYYwwYYK",
  ".KYYYK.",
  "..KKK..",
];

const LEAF = [
  "..KKK..",
  ".KGGGGK",
  "KGgggGGK",
  "KGGGGGGK",
  ".KGGGGK.",
  "..KKKK..",
];

const LEAF_B = [
  ".KKKK..",
  "KGGGGK.",
  "KggGGGK",
  "KGGGGGK",
  ".KGGGGK",
  "..KKKK.",
];

const IVY_HEAD = [
  "..KKKKK..",
  ".KGGGGGGK",
  "KGKGGKGK.",
  "KGGGGGGGK",
  "KGGwwGGGK",
  ".KGGGGGGK",
  "..KGGGGK.",
  "...KKKK..",
];

const SEED = [
  ".KKKK.",
  "KYYYYK",
  "KYyYYK",
  "KYYYYK",
  ".KYYK.",
  "..KK..",
];

const SPARK = [
  "...Y...",
  ".YYYYY.",
  "YYyyyYY",
  ".YYYYY.",
  "...Y...",
];

export const SPR = {
  ryanDown: bake(RYAN_DOWN),
  ryanDownWalk: bake(RYAN_DOWN_WALK),
  ryanUp: bake(RYAN_UP),
  ryanUpWalk: bake(RYAN_UP_WALK),
  ryanSide: bake(RYAN_SIDE),
  ryanSideWalk: bake(RYAN_SIDE_WALK),
  ryanCast: bake(RYAN_CAST, 3),
  puffling: bake(PUFFLING),
  jay: bake(JAY),
  hare: bake(HARE),
  hareCrouch: bake(HARE_CROUCH),
  acornA: bake(ACORN_A),
  acornB: bake(ACORN_B),
  sprout: bake(SPROUT),
  sproutSm: bake(SPROUT_SM, 3),
  turtle: bake(TURTLE),
  bloom: bake(BLOOM),
  pollen: bake(POLLEN, 3),
  leaf: bake(LEAF, 3),
  leafB: bake(LEAF_B, 3),
  ivy: bake(IVY_HEAD),
  seed: bake(SEED, 3),
  spark: bake(SPARK, 3),
  heart: bake(
    [".R.R.", "RRRRR", "RRRRR", ".RRR.", "..R.."],
    3
  ),
  bomb: bake(
    ["..Y..", ".YYY.", "YYYYY", ".YYY.", "..Y.."],
    3
  ),
};

/** Behavior → theme. Ids stay so waves and tests do not change. */
export const THEME_NAMES = {
  wanderer: "Puffling",
  diamond: "Thistle Jay",
  pink: "Fern Hare",
  spinner: "Acorn Spinner",
  splitter: "Split Sprout",
  splitterChild: "Sprout Bud",
  snake: "Ivy Wisp",
  tank: "Moss Turtle",
  void: "Gust Bloom",
  atom: "Pollen Puff",
};

function facing(angle) {
  const a = Math.atan2(Math.sin(angle), Math.cos(angle));
  const d = (a * 180) / Math.PI;
  if (d >= -45 && d < 45) return "right";
  if (d >= 45 && d < 135) return "down";
  if (d >= -135 && d < -45) return "up";
  return "left";
}

function ryanSprite(dir, walk) {
  if (dir === "down") return walk ? SPR.ryanDownWalk : SPR.ryanDown;
  if (dir === "up") return walk ? SPR.ryanUpWalk : SPR.ryanUp;
  return walk ? SPR.ryanSideWalk : SPR.ryanSide;
}

export function drawPixelPlayer(ctx, player, t = 0) {
  if (!player) return;
  const blink = player.invuln > 0 && Math.floor(player.invuln / 80) % 2 === 0;
  if (blink) return;
  const spd = Math.hypot(player.vx || 0, player.vy || 0);
  const moving = spd > 36;
  const ang = moving ? Math.atan2(player.vy, player.vx) : player.angle || 0;
  const dir = facing(ang);
  const walk = moving && Math.floor(t * 8) % 2 === 1;
  const sprite = ryanSprite(dir, walk);
  shadow(ctx, player.x, player.y, 18, 10);
  blit(ctx, sprite, player.x, player.y, { flipX: dir === "left" });
  if ((player.fireCd || 0) > 0.04) {
    const c = Math.cos(player.angle || 0);
    const s = Math.sin(player.angle || 0);
    blit(ctx, SPR.spark, player.x + c * 46, player.y + s * 46);
  }
}

export function drawPixelAfterimages(ctx, images) {
  if (!images) return;
  for (let i = 0; i < images.length; i++) {
    const im = images[i];
    const a = ((i + 1) / (images.length + 1)) * 0.35;
    const dir = facing(im.angle || 0);
    blit(ctx, ryanSprite(dir, false), im.x, im.y, {
      flipX: dir === "left",
      alpha: a,
    });
  }
}

export function drawPixelBullets(ctx, bullets) {
  if (!bullets) return;
  for (const b of bullets) {
    const sp = Math.hypot(b.vx, b.vy) || 1;
    const nx = b.vx / sp;
    const ny = b.vy / sp;
    for (let i = 2; i >= 0; i--) {
      const px = Math.round(b.x - nx * i * PX * 2);
      const py = Math.round(b.y - ny * i * PX * 2);
      ctx.fillStyle = i === 0 ? "#fff4b0" : i === 1 ? "#f0d24a" : "#e07030";
      const s = i === 0 ? PX * 2 : PX;
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
    }
  }
}

export function drawPixelGeoms(ctx, geoms, t = 0) {
  if (!geoms) return;
  for (const g of geoms) {
    let alpha = 1;
    if (g.life < 1.35) {
      alpha = Math.floor(t * 12) % 2 === 0 ? 1 : 0.25;
    }
    const bob = Math.sin(t * 6 + g.x * 0.05) * 2;
    blit(ctx, SPR.seed, g.x, g.y + bob, { alpha });
  }
}

function enemySprite(e, t) {
  switch (e.type) {
    case "diamond":
      return SPR.jay;
    case "pink":
      return e.coiling > 0 || e.dashing > 0 ? SPR.hareCrouch : SPR.hare;
    case "spinner":
      return Math.floor((e.spin || 0) * 1.4 + t * 10) % 2 === 0 ? SPR.acornA : SPR.acornB;
    case "splitter":
      return SPR.sprout;
    case "splitterChild":
      return SPR.sproutSm;
    case "tank":
      return SPR.turtle;
    case "void":
      return SPR.bloom;
    case "atom":
      return SPR.pollen;
    default:
      return SPR.puffling;
  }
}

function flips(e) {
  if (e.type === "wanderer" || e.type === "void" || e.type === "atom" || e.type === "spinner") {
    return false;
  }
  return Math.cos(e.angle || 0) < 0;
}

export function drawPixelEnemies(ctx, enemies, t = 0) {
  if (!enemies) return;
  const outlineEnd = GFX.ENEMY_OUTLINE_END ?? 0.58;
  for (const e of enemies) {
    if (!e || e.dead) continue;
    if (e.type === "snake") {
      drawIvy(ctx, e, t);
      continue;
    }
    const outline = (e.enter != null ? e.enter : 1) < outlineEnd;
    let sprite = enemySprite(e, t);
    if (outline) sprite = tinted(sprite, "rgba(210, 48, 48, 0.78)");
    const big = !!(e.pathBoss || e.boss);
    shadow(ctx, e.x, e.y, big ? 28 : 14, 8);
    if (big) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(e.x), Math.round(e.y));
      ctx.scale(2, 2);
      blit(ctx, sprite, 0, 0, { flipX: flips(e), alpha: outline && Math.sin(t * 18) > 0 ? 0.55 : 1 });
      ctx.restore();
    } else {
      blit(ctx, sprite, e.x, e.y, {
        flipX: flips(e),
        alpha: outline && Math.sin(t * 18) > 0 ? 0.45 : 1,
      });
    }
    if (e.type === "void") drawGust(ctx, e, t);
  }
}

function drawIvy(ctx, e, t) {
  const outlineEnd = GFX.ENEMY_OUTLINE_END ?? 0.58;
  const outline = (e.enter != null ? e.enter : 1) < outlineEnd;
  let segs = [];
  try {
    segs = snakeSegments(e) || [];
  } catch {
    segs = [];
  }
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    const leaf = i % 2 ? SPR.leaf : SPR.leafB;
    const side = i % 2 === 0 ? 8 : -8;
    blit(ctx, outline ? tinted(leaf, "rgba(210, 48, 48, 0.78)") : leaf, s.x + side, s.y, {
      alpha: outline && Math.sin(t * 18) > 0 ? 0.45 : 1,
    });
  }
  const head = outline ? tinted(SPR.ivy, "rgba(210, 48, 48, 0.78)") : SPR.ivy;
  blit(ctx, head, e.x, e.y, { flipX: Math.cos(e.angle || 0) < 0 });
}

function drawGust(ctx, e, t) {
  const r = 22 + (Math.sin((e.phase || 0) + t * 3) * 0.5 + 0.5) * 10;
  ctx.save();
  ctx.fillStyle = "#fff4b0";
  for (let i = 0; i < 5; i++) {
    const a = t * 2.4 + (e.phase || 0) + (i / 5) * Math.PI * 2;
    const px = Math.round(e.x + Math.cos(a) * r);
    const py = Math.round(e.y + Math.sin(a) * r * 0.6);
    ctx.fillRect(px, py, PX, PX);
  }
  ctx.restore();
}

export function drawPixelReticle(ctx, rx, ry) {
  const x = Math.round(rx);
  const y = Math.round(ry);
  ctx.save();
  ctx.fillStyle = "#1a1420";
  ctx.fillRect(x - 6, y - 1, 4, 3);
  ctx.fillRect(x + 3, y - 1, 4, 3);
  ctx.fillRect(x - 1, y - 6, 3, 4);
  ctx.fillRect(x - 1, y + 3, 3, 4);
  ctx.fillStyle = "#f0d24a";
  ctx.fillRect(x - 5, y, 3, 1);
  ctx.fillRect(x + 3, y, 3, 1);
  ctx.fillRect(x, y - 5, 1, 3);
  ctx.fillRect(x, y + 3, 1, 3);
  ctx.restore();
}

export function uiURL(sprite) {
  if (!sprite?.canvas || !sprite.canvas.toDataURL) return "";
  sprite._url = sprite._url || sprite.canvas.toDataURL();
  return sprite._url;
}

// ── 5×7 bitmap font (title screen) ─────────────────────────

const GLYPH = {
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 14],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [14, 17, 16, 14, 1, 17, 14],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14],
  1: [4, 12, 4, 4, 4, 4, 14],
  2: [14, 17, 1, 6, 8, 16, 31],
  3: [14, 17, 1, 6, 1, 17, 14],
  4: [2, 6, 10, 18, 31, 2, 2],
  5: [31, 16, 30, 1, 1, 17, 14],
  6: [6, 8, 16, 30, 17, 17, 14],
  7: [31, 1, 2, 4, 8, 8, 8],
  8: [14, 17, 17, 14, 17, 17, 14],
  9: [14, 17, 17, 15, 1, 2, 12],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0, 4],
  ",": [0, 0, 0, 0, 4, 4, 8],
  "'": [4, 4, 8, 0, 0, 0, 0],
  "!": [4, 4, 4, 4, 4, 0, 4],
  "?": [14, 17, 1, 2, 4, 0, 4],
  "-": [0, 0, 0, 31, 0, 0, 0],
  ":": [0, 4, 4, 0, 4, 4, 0],
};

export function textWidth(text, scale = 1) {
  return String(text).length * (6 * scale);
}

export function drawText(ctx, text, x, y, scale, color, outline) {
  const s = scale || 1;
  const str = String(text).toUpperCase();
  if (outline) {
    drawText(ctx, str, x - s, y, s, outline);
    drawText(ctx, str, x + s, y, s, outline);
    drawText(ctx, str, x, y - s, s, outline);
    drawText(ctx, str, x, y + s, s, outline);
  }
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of str) {
    const g = GLYPH[ch] || GLYPH[" "];
    for (let row = 0; row < 7; row++) {
      const bits = g[row] || 0;
      for (let col = 0; col < 5; col++) {
        if ((bits >> (4 - col)) & 1) ctx.fillRect(cx + col * s, y + row * s, s, s);
      }
    }
    cx += 6 * s;
  }
}

export function wrapText(text, maxChars) {
  const words = String(text).replace(/—/g, "-").split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}
