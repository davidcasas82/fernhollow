/**
 * Fernhollow castle courtyard, painted once and blitted crisp.
 * Decorative walls sit on the arena edge. Collision is still the full
 * rectangle, so gameplay bounds do not change.
 */

import { PX } from "./sprites.js";

const NIGHT = "#1b2a5a";
const STONE = "#8d7b68";
const STONE_D = "#5c4e42";
const STONE_L = "#c4b49a";
const MORTAR = "#3e342c";
const COBBLE = "#7a6a58";
const COBBLE_D = "#5c4e40";
const COBBLE_L = "#9a8870";
const PATH = "#a89478";
const MOSS = "#3d8c3a";
const MOSS_D = "#1e4a24";
const LEAF = "#7dba4a";
const WATER = "#3a7ec4";
const WATER_D = "#1e4e86";
const WATER_L = "#8ec4f0";
const BANNER = "#2f8f4a";
const BANNER_D = "#1f6b38";
const GOLD = "#f0d24a";
const TORCH = "#e07030";
const FLAME = "#fff4b0";
const IRON = "#2a241e";

let cache = null;
let torches = [];

function paint(ctx, w, h) {
  const cols = Math.ceil(w / PX);
  const rows = Math.ceil(h / PX);
  const side = 16;
  const top = 22;
  const bot = 16;
  const mid = Math.floor(cols / 2);

  const put = (x, y, color, cw = 1, ch = 1) => {
    if (x >= cols || y >= rows) return;
    ctx.fillStyle = color;
    ctx.fillRect(x * PX, y * PX, cw * PX, ch * PX);
  };

  ctx.fillStyle = COBBLE;
  ctx.fillRect(0, 0, w, h);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const n = (x * 17 + y * 13 + ((x * y) % 7)) & 7;
      let col = n === 0 ? COBBLE_D : n === 1 ? COBBLE_L : COBBLE;
      const onPath = x > mid - 10 && x < mid + 10 && y > top && y < rows - 4;
      if (onPath) col = n % 3 === 0 ? PATH : COBBLE_L;
      put(x, y, col);
    }
  }

  const wall = (x, y) => {
    const gate = x > mid - 16 && x < mid + 16 && y < top + 2;
    const gap = x > mid - 12 && x < mid + 12 && y > rows - bot - 1;
    if (gate || gap) return false;
    return x < side || y < top || x >= cols - side || y >= rows - bot;
  };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!wall(x, y)) continue;
      const brick = (Math.floor(x / 4) + Math.floor(y / 3)) % 2 === 0;
      const edge = x === side - 1 || y === top - 1 || x === cols - side || y === rows - bot;
      put(x, y, edge ? STONE_L : brick ? STONE : STONE_D);
      if (x % 4 === 0 || y % 3 === 0) put(x, y, MORTAR);
    }
  }

  // Battlement notches along the inner top lip
  for (let x = side; x < cols - side; x += 8) {
    for (let k = 0; k < 3; k++) put(x + k, top - 1, STONE_L);
  }

  // Corner towers
  const towers = [
    [4, 4],
    [cols - 14, 4],
    [4, rows - 14],
    [cols - 14, rows - 14],
    [mid - 22, 4],
    [mid + 12, 4],
  ];
  for (const [tx, ty] of towers) {
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 10; x++) {
        const edge = x === 0 || y === 0 || x === 9 || y === 11;
        put(tx + x, ty + y, edge ? STONE_L : (x + y) % 2 ? STONE : STONE_D);
      }
    }
    put(tx + 4, ty + 5, NIGHT, 2, 3);
  }

  // Back gate
  for (let y = 4; y < top + 1; y++) {
    for (let x = mid - 14; x <= mid + 14; x++) {
      put(x, y, STONE_D);
    }
  }
  for (let y = 6; y < top - 1; y++) {
    for (let x = mid - 8; x <= mid + 8; x++) {
      put(x, y, IRON);
      if ((x + y) % 2 === 0) put(x, y, "#3a3228");
    }
  }
  put(mid - 10, 5, GOLD, 2, top - 7);
  put(mid + 8, 5, GOLD, 2, top - 7);

  // Banners on the north wall
  for (const bx of [mid - 40, mid - 28, mid + 26, mid + 38]) {
    put(bx, 8, GOLD, 5, 1);
    for (let y = 9; y < 16; y++) {
      put(bx, y, y % 2 ? BANNER : BANNER_D, 5, 1);
      put(bx + 2, y, GOLD);
    }
    put(bx + 1, 16, GOLD, 3, 2);
  }

  // Fountain, upper-left of the open floor
  const fx = 78;
  const fy = 48;
  const fr = 14;
  for (let y = -fr; y <= fr; y++) {
    for (let x = -fr; x <= fr; x++) {
      const d = Math.hypot(x, y);
      if (d > fr) continue;
      if (d > fr - 2) put(fx + x, fy + y, STONE_L);
      else if (d > fr - 3.2) put(fx + x, fy + y, STONE);
      else put(fx + x, fy + y, d < 3 ? WATER_L : (x + y) % 3 === 0 ? WATER_D : WATER);
    }
  }
  put(fx - 1, fy - fr - 3, WATER_L, 2, 3);

  // Planters and ferns kept to the edges so the floor stays open
  const ferns = [
    [28, 34],
    [28, 70],
    [28, rows - 36],
    [cols - 34, 34],
    [cols - 34, 78],
    [cols - 34, rows - 40],
    [mid - 30, 32],
    [mid + 26, 32],
    [48, rows - 32],
    [cols - 52, rows - 32],
  ];
  for (const [px, py] of ferns) stampFern(put, px, py);

  torches = [
    [side + 2, 40],
    [side + 2, rows / 2],
    [side + 2, rows - 40],
    [cols - side - 3, 40],
    [cols - side - 3, rows / 2],
    [cols - side - 3, rows - 40],
    [mid - 24, top + 2],
    [mid + 22, top + 2],
  ].map(([x, y]) => ({ x: x * PX, y: y * PX }));
}

function stampFern(put, cx, cy) {
  const blob = [
    [0, 0, MOSS_D],
    [1, 0, MOSS],
    [-1, 0, MOSS],
    [0, -1, LEAF],
    [2, -1, LEAF],
    [-2, 0, MOSS_D],
    [0, 1, MOSS_D],
    [1, 1, MOSS],
    [-1, -1, LEAF],
    [2, 1, MOSS],
    [3, 0, LEAF],
    [-2, -1, LEAF],
  ];
  for (const [dx, dy, col] of blob) put(cx + dx, cy + dy, col);
}

function drawTorches(ctx, t) {
  const flick = Math.floor(t * 8) % 2;
  for (const p of torches) {
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    ctx.fillStyle = "#5c4e42";
    ctx.fillRect(x, y, PX * 2, PX * 3);
    ctx.fillStyle = TORCH;
    ctx.fillRect(x - PX, y - PX * (2 + flick), PX * 4, PX * 2);
    ctx.fillStyle = FLAME;
    ctx.fillRect(x, y - PX * (3 + flick), PX * 2, PX);
  }
}

export function drawCourtyard(ctx, w, h, t = 0) {
  if (!ctx) return;
  const key = `${w}x${h}`;
  if (!cache || cache.key !== key) {
    if (typeof document === "undefined" || !document.createElement) {
      ctx.fillStyle = COBBLE;
      ctx.fillRect(0, 0, w, h);
      return;
    }
    const c = document.createElement("canvas");
    c.width = Math.max(1, w);
    c.height = Math.max(1, h);
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    paint(g, c.width, c.height);
    cache = { key, c };
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cache.c, 0, 0);
  drawTorches(ctx, t);
  // Quiet night sky is the page around the board; a thin lip keeps the rim readable.
  ctx.fillStyle = NIGHT;
  ctx.fillRect(0, 0, w, PX);
}
