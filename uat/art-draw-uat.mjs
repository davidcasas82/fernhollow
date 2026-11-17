/**
 * Sprites must come from atlas drawImage calls. A path or rect primitive fails this.
 * Run: node uat/art-draw-uat.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const js = (name) => pathToFileURL(path.join(root, "js", name)).href;

const FORBIDDEN = [
  "beginPath",
  "fillRect",
  "strokeRect",
  "arc",
  "ellipse",
  "fill",
  "stroke",
  "moveTo",
  "lineTo",
  "quadraticCurveTo",
  "bezierCurveTo",
  "roundRect",
  "rect",
  "fillText",
  "strokeText",
  "scale",
  "createLinearGradient",
  "createRadialGradient",
];

function recorder() {
  const calls = [];
  const ctx = {
    imageSmoothingEnabled: true,
    globalAlpha: 1,
    calls,
    save() {
      calls.push(["save"]);
    },
    restore() {
      calls.push(["restore"]);
    },
    translate(x, y) {
      calls.push(["translate", x, y]);
    },
    rotate(a) {
      calls.push(["rotate", a]);
    },
    transform(a, b, c, d, e, f) {
      calls.push(["transform", a, b, c, d, e, f]);
    },
    drawImage(...args) {
      calls.push(["drawImage", ...args]);
    },
  };
  for (const name of FORBIDDEN) {
    ctx[name] = (...args) => {
      calls.push([name, ...args]);
    };
  }
  return ctx;
}

function assertSprites(ctx, label) {
  const draws = ctx.calls.filter((c) => c[0] === "drawImage");
  const bad = ctx.calls.filter((c) => FORBIDDEN.includes(c[0]));
  assert.equal(bad.length, 0, `${label} used ${bad.map((c) => c[0]).join(", ")}`);
  assert.ok(draws.length > 0, `${label} drew no atlas frame`);
  for (const call of draws) {
    const img = call[1];
    const sw = call[4];
    const sh = call[5];
    const dw = call[8];
    const dh = call[9];
    assert.ok(img && img.__artFile, `${label} drawImage source is not an atlas sheet`);
    assert.equal(dw % sw, 0, `${label} width scale is not an integer`);
    assert.equal(dh % sh, 0, `${label} height scale is not an integer`);
    assert.ok(dw / sw >= 1 && dh / sh >= 1, `${label} scale is below 1`);
  }
  return draws;
}

const { parseAtlas, bindArt, clipFrame } = await import(js("art.js"));
const { drawPlayer, drawEnemies, drawBullets, drawGeoms, drawHudIcons } = await import(
  js("render.js")
);
const { drawPanel, drawButton, drawBanner, drawBar, drawCursor } = await import(
  js("ui-frames.js")
);

const atlas = JSON.parse(fs.readFileSync(path.join(root, "assets/art/atlas.json"), "utf8"));
const walls = JSON.parse(
  fs.readFileSync(path.join(root, "assets/art/courtyard-walls.json"), "utf8")
);
const defs = parseAtlas(atlas, walls);
const images = {};
for (const file of defs.files) {
  images[file.file] = {
    width: file.w,
    height: file.h,
    naturalWidth: file.w,
    naturalHeight: file.h,
    __artFile: file.file,
  };
}
const book = bindArt(defs, images);

assert.equal(book.floor.x, 192);
assert.equal(book.floor.y, 244);
assert.equal(book.floor.w, 1224);
assert.equal(book.floor.h, 524);
assert.equal(book.behavior.splitterChild, "sprout-bud");
assert.equal(book.behavior.snake, "ivy-wisp");
assert.equal(book.behavior.snakeSegment, "ivy-segment");
assert.equal(book.behavior.pathBoss, "moss-giant");

const idle = clipFrame(book.sheets.ryan, "idle_down", 0);
assert.equal(idle.sx, 0);
assert.equal(idle.sy, 0);
assert.equal(idle.sw, 80);
assert.equal(idle.sh, 96);
assert.equal(idle.scale, 1);

const shoot = clipFrame(book.sheets.ryan, "shoot_right", 0);
assert.equal(shoot.sx, 400);
assert.equal(shoot.sy, 288);

const ctx = recorder();
drawPlayer(ctx, { x: 400, y: 500, vx: 0, vy: 0, angle: 0, fireCd: 0, r: 13, invuln: 0 }, 0);
let draws = assertSprites(ctx, "ryan idle");
assert.equal(draws[0][1].__artFile, "ryan.png");
assert.equal(draws[0][2], 0);
assert.equal(draws[0][3], 0);
assert.equal(ctx.imageSmoothingEnabled, false);

ctx.calls.length = 0;
drawPlayer(
  ctx,
  { x: 400, y: 500, vx: 80, vy: 0, angle: -Math.PI / 2, fireCd: 0, r: 13, invuln: 0, face: "down" },
  0
);
draws = assertSprites(ctx, "ryan walk");
assert.equal(draws[0][2], 80);
assert.equal(draws[0][3], 288);

ctx.calls.length = 0;
drawPlayer(
  ctx,
  { x: 400, y: 500, vx: 0, vy: 0, angle: 0, fireCd: 0.2, r: 13, invuln: 0 },
  0
);
draws = assertSprites(ctx, "ryan shoot");
assert.equal(draws[0][2], 400);
assert.equal(draws[0][3], 288);

const samples = [
  ["wanderer", "puffling.png"],
  ["diamond", "thistle-jay.png"],
  ["pink", "fern-hare.png"],
  ["spinner", "acorn-spinner.png"],
  ["splitter", "split-sprout.png"],
  ["splitterChild", "sprout-bud.png"],
  ["tank", "moss-turtle.png"],
  ["void", "gust-bloom.png"],
  ["atom", "pollen-puff.png"],
];
for (const [type, file] of samples) {
  ctx.calls.length = 0;
  drawEnemies(ctx, [{ type, x: 500, y: 500, dead: false, phase: 0, enter: 1 }], 0);
  draws = assertSprites(ctx, type);
  assert.equal(draws[0][1].__artFile, file, type);
}

ctx.calls.length = 0;
drawEnemies(
  ctx,
  [
    {
      type: "snake",
      x: 600,
      y: 500,
      r: 10,
      dead: false,
      enter: 1,
      phase: 0,
      segCount: 4,
      spacing: 1,
      history: [
        { x: 580, y: 500 },
        { x: 560, y: 510 },
        { x: 540, y: 520 },
        { x: 520, y: 520 },
      ],
    },
  ],
  0
);
draws = assertSprites(ctx, "ivy whip");
const files = new Set(draws.map((c) => c[1].__artFile));
assert.ok(files.has("ivy-wisp.png"), "whip head");
assert.ok(files.has("ivy-segment.png"), "whip segments");

ctx.calls.length = 0;
drawEnemies(
  ctx,
  [{ type: "tank", pathBoss: true, x: 700, y: 500, dead: false, phase: 0, enter: 1 }],
  0
);
draws = assertSprites(ctx, "elite");
assert.equal(draws[0][1].__artFile, "moss-giant.png");

ctx.calls.length = 0;
drawBullets(ctx, [{ x: 420, y: 500, vx: 10, vy: 0, dead: false }], 0);
draws = assertSprites(ctx, "sun-bolt");
assert.equal(draws[0][1].__artFile, "fx.png");
assert.equal(draws[0][2], 0);
assert.equal(draws[0][3], 0);

ctx.calls.length = 0;
drawGeoms(ctx, [{ x: 450, y: 520, life: 10, maxLife: 10, r: 6 }], 0);
draws = assertSprites(ctx, "sunseed");
assert.equal(draws[0][3], 64);

ctx.calls.length = 0;
drawHudIcons(ctx, 3, 2);
draws = assertSprites(ctx, "hud");
assert.equal(draws.length, 5);
assert.ok(draws.every((c) => c[1].__artFile === "fx.png"));

assert.equal(book.ui.image.__artFile, "ui-frames.png");
assert.equal(book.ui.scale, 2);
assert.equal(book.ui.cells.cursor.hotspot.x, 0);
assert.equal(book.ui.cells.cursor.hotspot.y, 6);
assert.ok(fs.existsSync(path.join(root, "assets/art/favicon-16.png")));
assert.ok(fs.existsSync(path.join(root, "assets/art/favicon-32.png")));

function assertUi(label) {
  const drawn = assertSprites(ctx, label);
  assert.ok(
    drawn.every((c) => c[1].__artFile === "ui-frames.png" && c[8] / c[4] === 2 && c[9] / c[5] === 2),
    `${label} did not stay on ui-frames at scale 2`
  );
  return drawn;
}

ctx.calls.length = 0;
drawPanel(ctx, book.ui, 320, 240);
assertUi("panel");

ctx.calls.length = 0;
drawButton(ctx, book.ui, 240, 48);
assertUi("button");

ctx.calls.length = 0;
drawBanner(ctx, book.ui);
assertUi("banner");

ctx.calls.length = 0;
drawBar(ctx, book.ui, 192, 24, "heart", 0.5);
assertUi("heart bar");

ctx.calls.length = 0;
drawBar(ctx, book.ui, 192, 24, "sun", 1);
assertUi("sun bar");

ctx.calls.length = 0;
drawCursor(ctx, book.ui);
const cursorDraw = assertUi("cursor");
assert.equal(cursorDraw[0][2], book.ui.cells.cursor.sx);
assert.equal(cursorDraw[0][3], book.ui.cells.cursor.sy);

console.log("art-draw-uat: sprites come from the atlas");
