/**
 * Kingdom chrome from ui-frames.png. Every piece is drawImage at scale 2.
 * The sheet's one corner is mirrored for the other three. No paths or rects.
 */

import { artBook } from "./art.js";

const SCALE = 2;

function blit(ctx, image, sx, sy, sw, sh, dx, dy, flipX, flipY) {
  if (sw < 1 || sh < 1) return;
  const dw = sw * SCALE;
  const dh = sh * SCALE;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flipX || flipY) {
    ctx.translate(dx + (flipX ? dw : 0), dy + (flipY ? dh : 0));
    ctx.transform(flipX ? -1 : 1, 0, 0, flipY ? -1 : 1, 0, 0);
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, dw, dh);
  } else {
    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  }
  ctx.restore();
}

function tileSpan(ctx, image, sx, sy, sw, sh, x0, y0, x1, y1, flipX, flipY) {
  const tileW = sw * SCALE;
  const tileH = sh * SCALE;
  for (let y = y0; y < y1; y += tileH) {
    const shHere = Math.min(sh, Math.floor((y1 - y) / SCALE));
    if (shHere < 1) break;
    for (let x = x0; x < x1; x += tileW) {
      const swHere = Math.min(sw, Math.floor((x1 - x) / SCALE));
      if (swHere < 1) break;
      blit(ctx, image, sx, sy, swHere, shHere, x, y, flipX, flipY);
    }
  }
}

export function drawPanel(ctx, ui, w, h) {
  if (!ctx || !ui?.image) return;
  const corner = ui.cells["panel-corner"];
  const edgeH = ui.cells["panel-edge-h"];
  const edgeV = ui.cells["panel-edge-v"];
  const fill = ui.cells["panel-fill"];
  const c = corner.sw * SCALE;
  if (w < c * 2 || h < c * 2) return;
  ctx.imageSmoothingEnabled = false;
  const img = ui.image;
  blit(ctx, img, corner.sx, corner.sy, corner.sw, corner.sh, 0, 0, false, false);
  blit(ctx, img, corner.sx, corner.sy, corner.sw, corner.sh, w - c, 0, true, false);
  blit(ctx, img, corner.sx, corner.sy, corner.sw, corner.sh, 0, h - c, false, true);
  blit(ctx, img, corner.sx, corner.sy, corner.sw, corner.sh, w - c, h - c, true, true);
  tileSpan(ctx, img, edgeH.sx, edgeH.sy, edgeH.sw, edgeH.sh, c, 0, w - c, c, false, false);
  tileSpan(ctx, img, edgeH.sx, edgeH.sy, edgeH.sw, edgeH.sh, c, h - c, w - c, h, false, true);
  tileSpan(ctx, img, edgeV.sx, edgeV.sy, edgeV.sw, edgeV.sh, 0, c, c, h - c, false, false);
  tileSpan(ctx, img, edgeV.sx, edgeV.sy, edgeV.sw, edgeV.sh, w - c, c, w, h - c, true, false);
  tileSpan(ctx, img, fill.sx, fill.sy, fill.sw, fill.sh, c, c, w - c, h - c, false, false);
}

export function drawButton(ctx, ui, w, h) {
  if (!ctx || !ui?.image) return;
  const cell = ui.cells.button;
  const cap = 4;
  const capD = cap * SCALE;
  if (w < capD * 2 || h < cell.sh * SCALE) return;
  ctx.imageSmoothingEnabled = false;
  const img = ui.image;
  blit(ctx, img, cell.sx, cell.sy, cap, cell.sh, 0, 0, false, false);
  tileSpan(
    ctx,
    img,
    cell.sx + cap,
    cell.sy,
    4,
    cell.sh,
    capD,
    0,
    w - capD,
    cell.sh * SCALE,
    false,
    false
  );
  blit(ctx, img, cell.sx + cell.sw - cap, cell.sy, cap, cell.sh, w - capD, 0, false, false);
}

export function drawBanner(ctx, ui) {
  if (!ctx || !ui?.image) return;
  const cell = ui.cells.banner;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    ui.image,
    cell.sx,
    cell.sy,
    cell.sw,
    cell.sh,
    0,
    0,
    cell.sw * SCALE,
    cell.sh * SCALE
  );
}

export function drawBar(ctx, ui, w, h, kind, frac) {
  if (!ctx || !ui?.image) return;
  const back = ui.cells["bar-back"];
  const fill = ui.cells[kind === "sun" ? "bar-sun" : "bar-heart"];
  if (!back || !fill || w < back.sh * SCALE || h < back.sh * SCALE) return;
  ctx.imageSmoothingEnabled = false;
  tileSpan(ctx, ui.image, back.sx, back.sy, 8, back.sh, 0, 0, w, back.sh * SCALE, false, false);
  const pad = 2 * SCALE;
  const inner = Math.max(0, w - pad * 2);
  const filled = Math.floor(inner * Math.max(0, Math.min(1, frac)));
  const tile = fill.sw * SCALE;
  let x = pad;
  const end = pad + filled;
  while (x < end) {
    const sw = Math.min(fill.sw, Math.floor((end - x) / SCALE));
    if (sw < 1) break;
    blit(ctx, ui.image, fill.sx, fill.sy, sw, fill.sh, x, pad, false, false);
    x += tile;
  }
}

export function drawCursor(ctx, ui) {
  if (!ctx || !ui?.image) return;
  const cell = ui.cells.cursor;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    ui.image,
    cell.sx,
    cell.sy,
    cell.sw,
    cell.sh,
    0,
    0,
    cell.sw * SCALE,
    cell.sh * SCALE
  );
}

function even(n, min) {
  const v = Math.max(min, n | 0);
  return v - (v % SCALE);
}

function sheet(el) {
  let canvas = el.querySelector(":scope > canvas.ui-sheet");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "ui-sheet";
    canvas.setAttribute("aria-hidden", "true");
    el.prepend(canvas);
    el.classList.add("ui-sheet-host");
  }
  return canvas;
}

function sizeCanvas(canvas, w, h) {
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}

export function paintUi() {
  const ui = artBook()?.ui;
  if (!ui?.image || typeof document === "undefined") return;

  const panels = document.querySelectorAll(
    ".title-menu, .interrupt-panel, .king-panel, .path-map, .path-brief, .path-result, .gameover-menu, .stat, .loading-card"
  );
  panels.forEach((el) => {
    if (el.clientWidth < 8 || el.clientHeight < 8) return;
    const canvas = sheet(el);
    const w = even(el.clientWidth, 48);
    const h = even(el.clientHeight, 48);
    sizeCanvas(canvas, w, h);
    drawPanel(canvas.getContext("2d"), ui, w, h);
  });

  document.querySelectorAll("button.btn, button.blessing, button.touch-fab, button.title-help").forEach((el) => {
    if (el.clientWidth < 8) return;
    const canvas = sheet(el);
    const w = even(el.clientWidth, 16);
    const h = 24 * SCALE;
    sizeCanvas(canvas, w, h);
    drawButton(canvas.getContext("2d"), ui, w, h);
  });

  const banner = document.getElementById("wave-banner");
  if (banner) {
    const canvas = sheet(banner);
    const cell = ui.cells.banner;
    sizeCanvas(canvas, cell.sw * SCALE, cell.sh * SCALE);
    drawBanner(canvas.getContext("2d"), ui);
  }

  document.querySelectorAll(".stat-meter").forEach((el) => {
    if (el.clientWidth < 8) return;
    const canvas = sheet(el);
    const w = even(el.clientWidth, 24);
    const h = 12 * SCALE;
    sizeCanvas(canvas, w, h);
    const ink = el.querySelector("i");
    const frac = Math.max(0, Math.min(1, parseFloat(ink?.style.width) / 100 || 0));
    const kind = el.classList.contains("xp-meter")
      ? "sun"
      : el.classList.contains("health-meter")
        ? "heart"
        : null;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    if (kind) drawBar(ctx, ui, w, h, kind, frac);
    else {
      const back = ui.cells["bar-back"];
      tileSpan(ctx, ui.image, back.sx, back.sy, 8, back.sh, 0, 0, w, h, false, false);
    }
  });

  const cursor = document.getElementById("menu-cursor");
  if (cursor && cursor.width === 24) drawCursor(cursor.getContext("2d"), ui);
  placeMenuCursor();
}

export function placeMenuCursor() {
  const cursor = document.getElementById("menu-cursor");
  if (!cursor) return;
  const el = document.querySelector(".is-focused");
  const shown = el && el.getClientRects().length > 0;
  cursor.hidden = !shown;
  if (!shown) return;
  const box = el.getBoundingClientRect();
  const hotY = 6 * SCALE;
  cursor.style.left = `${Math.round(box.left - 2)}px`;
  cursor.style.top = `${Math.round(box.top + box.height / 2 - hotY)}px`;
}

export function mountUiFrames() {
  if (typeof document === "undefined") return;
  const paint = () => paintUi();
  paint();
  window.addEventListener("resize", paint);
  if (typeof ResizeObserver === "function") {
    const watch = new ResizeObserver(paint);
    watch.observe(document.body);
  }
}
