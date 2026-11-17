/**
 * Pixel title card: night castle, Ryan, story, PRESS START.
 * Painted on a 480×270 buffer and scaled with nearest-neighbor.
 */

import { SPR, blit, drawText, textWidth, wrapText } from "./sprites.js";

export const TITLE_W = 480;
export const TITLE_H = 270;

export const STORY =
  "While the knights of Fernhollow were away in the far meadows, a band of mischievous forest creatures slipped into the castle courtyard and made off with the kingdom's golden crown. The courtyard is the heart of Fernhollow, and now wave after wave of odd little monsters come tumbling over the walls to keep the crown hidden. Only young Ryan, in his lucky green hoodie and a borrowed red neckerchief, is brave enough to stand in the middle of the stones and send them packing with sparks of sunlight-magic. He does not have to go looking for them - they come to him, faster and thicker as the night goes on. If Ryan can hold the courtyard, the crown will shine on Fernhollow once more.";

const SKY = "#1b2a6b";
const SKY_D = "#101a40";
const STONE = "#8d7b68";
const STONE_D = "#5c4e42";
const STONE_L = "#c4b49a";
const MOSS = "#2f8f4a";
const MOSS_D = "#1e4a24";
const LEAF = "#7dba4a";
const COBBLE = "#7a6a58";
const COBBLE_D = "#5c4e40";
const COBBLE_L = "#9a8870";
const GOLD = "#f0d24a";
const INK = "#1a1420";
const CREAM = "#fff4dc";

function px(ctx, x, y, color, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function tower(ctx, x, y, h) {
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < 36; col++) {
      const edge = col < 2 || col > 33 || row < 2;
      const merlon = row < 8 && col % 8 < 5;
      if (row < 8 && !merlon) {
        px(ctx, x + col, y + row, SKY);
        continue;
      }
      px(ctx, x + col, y + row, edge ? STONE_L : (col + row) % 5 === 0 ? STONE_D : STONE);
    }
  }
  px(ctx, x + 14, y + 22, "#f0c030", 8, 12);
  px(ctx, x + 16, y + 24, "#fff4b0", 4, 8);
  // Banner
  px(ctx, x + 12, y + 40, GOLD, 12, 2);
  for (let i = 0; i < 22; i++) px(ctx, x + 13, y + 42 + i, i % 2 ? MOSS : MOSS_D, 10, 1);
  px(ctx, x + 15, y + 62, GOLD, 6, 4);
}

function cloud(ctx, x, y) {
  px(ctx, x, y, "#d6def5", 18, 6);
  px(ctx, x + 4, y - 4, "#eef2ff", 12, 6);
  px(ctx, x + 8, y + 2, "#b7c4e6", 8, 3);
}

export function paintTitle(ctx, t = 0) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, TITLE_W, TITLE_H);
  // Soft night gradient as flat bands (no smooth blend)
  ctx.fillStyle = SKY_D;
  ctx.fillRect(0, 150, TITLE_W, TITLE_H - 150);

  disc(ctx, 70, 22, 16, "#f4e27a");
  disc(ctx, 78, 18, 13, SKY);
  px(ctx, 66, 30, "#e8c84a", 4, 3);
  px(ctx, 72, 40, "#e8c84a", 3, 3);

  cloud(ctx, 120, 28);
  cloud(ctx, 250, 18);
  cloud(ctx, 360, 40);

  const lines = ["RYAN AND THE", "SIEGE OF", "FERNHOLLOW"];
  let ty = 4;
  for (const line of lines) {
    const tw = textWidth(line, 3);
    drawText(ctx, line, Math.round((TITLE_W - tw) / 2), ty, 3, GOLD, INK);
    ty += 22;
  }

  // Far trees sit under the title, above the wall
  for (let x = 48; x < 430; x += 22) {
    const h = 8 + (x % 5) * 2;
    ctx.fillStyle = MOSS_D;
    ctx.fillRect(x, 96 - h, 12, h);
  }

  tower(ctx, 8, 70, 88);
  tower(ctx, TITLE_W - 44, 70, 88);

  for (let y = 100; y < 156; y++) {
    for (let x = 44; x < TITLE_W - 44; x++) {
      const brick = (Math.floor(x / 8) + Math.floor(y / 6)) % 2 === 0;
      px(ctx, x, y, y < 106 && x % 10 < 6 ? STONE_L : brick ? STONE : STONE_D);
    }
  }
  // A small lit window, off to the side so Ryan is not standing in a hole
  ctx.fillStyle = "#1a1428";
  ctx.fillRect(168, 116, 22, 28);
  ctx.fillStyle = "#f0c030";
  ctx.fillRect(174, 122, 10, 12);

  fern(ctx, 16, 150);
  fern(ctx, 430, 150);

  for (let y = 152; y < 168; y++) {
    for (let x = 0; x < TITLE_W; x++) {
      const n = (x * 3 + y * 5) % 7;
      px(ctx, x, y, n === 0 ? COBBLE_D : n === 1 ? COBBLE_L : COBBLE);
    }
  }

  // Title portrait sits under the wordmark. In-game Ryan is about 1/10 of the playfield.
  blit(ctx, SPR.ryanCast, 246, 118);
  blit(ctx, SPR.spark, 190, 108);

  // Story band. The approved title picture has no paragraph; theme.md asks for it.
  ctx.fillStyle = "#101a40";
  ctx.fillRect(6, 164, TITLE_W - 12, 84);
  ctx.fillStyle = GOLD;
  ctx.fillRect(6, 164, TITLE_W - 12, 1);
  const storyLines = wrapText(STORY, 76);
  storyLines.forEach((line, i) => {
    drawText(ctx, line, 10, 168 + i * 8, 1, CREAM);
  });

  for (let y = 248; y < TITLE_H; y++) {
    for (let x = 0; x < TITLE_W; x++) {
      const n = (x * 3 + y * 5) % 7;
      px(ctx, x, y, n === 0 ? COBBLE_D : n === 1 ? COBBLE_L : COBBLE);
    }
  }
  const label = "PRESS START";
  const tw = textWidth(label, 2);
  const blinkOn = Math.floor(t * 2) % 2 === 0;
  drawText(ctx, label, Math.round((TITLE_W - tw) / 2), 252, 2, blinkOn ? "#ffffff" : GOLD, INK);
}

function disc(ctx, x, y, r, color) {
  for (let row = -r; row <= r; row++) {
    for (let col = -r; col <= r; col++) {
      if (col * col + row * row <= r * r) px(ctx, x + col, y + row, color);
    }
  }
}

function fern(ctx, x, y) {
  ctx.fillStyle = MOSS_D;
  ctx.fillRect(x, y, 28, 16);
  ctx.fillStyle = LEAF;
  ctx.fillRect(x + 2, y - 6, 10, 10);
  ctx.fillRect(x + 12, y - 10, 12, 12);
  ctx.fillRect(x + 6, y + 4, 16, 8);
  ctx.fillStyle = MOSS;
  ctx.fillRect(x + 8, y - 2, 8, 8);
}

export function mountTitleScreen(canvas) {
  if (!canvas || typeof document === "undefined") return () => {};
  const buffer = document.createElement("canvas");
  buffer.width = TITLE_W;
  buffer.height = TITLE_H;
  const bctx = buffer.getContext("2d");
  let raf = 0;
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const frame = (now) => {
    const t = ((now || 0) - t0) / 1000;
    paintTitle(bctx, t);
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    const w = Math.max(1, Math.round((rect.width || TITLE_W) * dpr));
    const h = Math.max(1, Math.round((rect.height || TITLE_H) * dpr));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const scale = Math.max(1, Math.floor(Math.min(w / TITLE_W, h / TITLE_H)));
    const dw = TITLE_W * scale;
    const dh = TITLE_H * scale;
    ctx.fillStyle = SKY;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(buffer, Math.floor((w - dw) / 2), Math.floor((h - dh) / 2), dw, dh);
    if (typeof window !== "undefined") window.__titleReady = true;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
