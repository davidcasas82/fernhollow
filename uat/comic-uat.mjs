/**
 * Comic impact must not be drawn: no onomatopoeia, no starburst frame.
 * Run: node uat/comic-uat.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const js = (name) => pathToFileURL(path.join(root, "js", name)).href;

const { ParticleSystem, isComicWord } = await import(js("particles.js"));
const { updateEnemies } = await import(js("entities.js"));
const { installArt } = await import(js("art.js"));
const { COMIC_FX_KINDS, drawArtFx } = await import(js("render.js"));

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err: err.message });
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
  }
}

function recorder() {
  const calls = [];
  const ctx = {
    calls,
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    beginPath() {
      calls.push(["beginPath"]);
    },
    moveTo() {},
    lineTo() {},
    stroke() {
      calls.push(["stroke"]);
    },
    fill() {
      calls.push(["fill"]);
    },
    arc() {
      calls.push(["arc"]);
    },
    fillRect(...args) {
      calls.push(["fillRect", ...args]);
    },
    fillText(...args) {
      calls.push(["fillText", ...args]);
    },
    strokeText(...args) {
      calls.push(["strokeText", ...args]);
    },
    drawImage(...args) {
      calls.push(["drawImage", ...args]);
    },
  };
  return ctx;
}

test("comic words are refused before they can be drawn", () => {
  assert.equal(isComicWord("POW"), true);
  assert.equal(isComicWord("BANG!"), true);
  assert.equal(isComicWord("KABOOM"), true);
  assert.equal(isComicWord("+240"), false);
  assert.equal(isComicWord("MOSS GIANT"), false);
  const ps = new ParticleSystem();
  for (const word of ["POW", "BANG", "BOOM", "ZAP", "WHAM", "KAPOW"]) ps.floater(0, 0, word);
  assert.equal(ps.floaters.length, 0);
  ps.floater(12, 20, "+240", "#f4e2a8", 1);
  assert.equal(ps.floaters.length, 1);
  const ctx = recorder();
  ps.draw(ctx);
  const text = ctx.calls.filter((c) => c[0] === "fillText" || c[0] === "strokeText");
  assert.equal(text.length, 0, "score text used a stroke burst");
  assert.ok(ctx.calls.some((c) => c[0] === "fillRect"), "pixel glyphs were not drawn");
  const lines = ctx.calls.filter((c) => c[0] === "stroke" || c[0] === "beginPath");
  assert.equal(lines.length, 0, "pixel impact drew action lines");
});

test("starburst frames are not drawn; poof frames are", () => {
  assert.ok(COMIC_FX_KINDS.has("hit"));
  const image = { __artFile: "fx.png" };
  installArt({
    world: { w: 1600, h: 900 },
    floor: { x: 0, y: 0, w: 10, h: 10 },
    behavior: {},
    sheets: {
      fx: {
        image,
        clips: {
          hit: {
            fps: 8,
            frames: [{ sx: 0, sy: 128, sw: 64, sh: 64, ax: 32, ay: 32, scale: 1 }],
          },
          poof: {
            fps: 8,
            frames: [{ sx: 0, sy: 192, sw: 64, sh: 64, ax: 32, ay: 32, scale: 1 }],
          },
        },
      },
    },
  });
  const ctx = recorder();
  drawArtFx(ctx, [
    { kind: "hit", x: 40, y: 40, age: 0 },
    { kind: "poof", x: 80, y: 40, age: 0 },
  ]);
  const draws = ctx.calls.filter((c) => c[0] === "drawImage");
  assert.equal(draws.length, 1);
  assert.equal(draws[0][3], 192, "the drawn frame is not the poof row");
  assert.notEqual(draws[0][3], 128);
});

test("a hit shoves the creature a short way", () => {
  const enemy = {
    dead: false,
    enter: 1,
    type: "wanderer",
    x: 200,
    y: 200,
    r: 12,
    speed: 0,
    phase: 0,
    spin: 0,
    knockT: 0.12,
    knockX: 240,
    knockY: 0,
    flash: 0.12,
  };
  const player = { x: 800, y: 200, vx: 0, vy: 0 };
  const start = enemy.x;
  updateEnemies([enemy], player, 0.05, 1);
  assert.ok(enemy.x > start + 4, `moved ${enemy.x - start}`);
  assert.ok(enemy.x < start + 40, `shove too far: ${enemy.x - start}`);
  assert.ok(enemy.flash < 0.12);
});

test("screens and styles do not ask for comic lettering", () => {
  const files = ["index.html", "styles.css", "js/game.js", "js/main.js", "js/render.js"];
  const banned = [/comic-stamp/, /data-stamp/, /"POW"/, /"BANG"/, /"BOOM"/, /"ZAP"/, /"WHAM"/, /"KAPOW"/, /"KABOOM"/];
  for (const rel of files) {
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    for (const re of banned) assert.equal(re.test(text), false, `${rel} matches ${re}`);
  }
  const particles = fs.readFileSync(path.join(root, "js/particles.js"), "utf8");
  assert.equal(particles.includes("fillText"), false);
  assert.equal(particles.includes("strokeText"), false);
  assert.equal(particles.includes("stamp("), false);
});

const failed = results.filter((r) => !r.ok);
console.log(`\n=== Comic: ${results.length - failed.length}/${results.length} passed ===\n`);
if (failed.length) process.exitCode = 1;
