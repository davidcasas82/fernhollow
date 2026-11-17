/**
 * Magic bolts are pixel rects, capped, and off the character sprite path.
 * Run: node uat/magic-bolt-uat.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const js = (name) => pathToFileURL(path.join(root, "js", name)).href;

const {
  BoltFx,
  BOLT_SPARK_CAP,
  BOLT_TRAIL_CAP,
  BOLT_BURST_CAP,
  SPARK_LIFE_MIN,
  SPARK_LIFE_MAX,
} = await import(js("magic-bolts.js"));
const { BULLET_RADIUS, BULLET_SPEED, FIRE_COOLDOWN } = await import(js("constants.js"));
const { createBullet, updateBullets, ryanHandPoint } = await import(js("entities.js"));

const renderSrc = fs.readFileSync(path.join(root, "js", "render.js"), "utf8");
assert.equal(renderSrc.includes("magic-bolts"), false);
assert.equal(renderSrc.includes("BoltFx"), false);
assert.equal(renderSrc.includes("drawMagic"), false);

assert.equal(BULLET_RADIUS, 3);
assert.equal(BULLET_SPEED, 760);
assert.equal(FIRE_COOLDOWN, 0.13);
assert.equal(BOLT_TRAIL_CAP + BOLT_BURST_CAP, BOLT_SPARK_CAP);
assert.ok(SPARK_LIFE_MIN >= 0.2 && SPARK_LIFE_MAX <= 0.4);
assert.ok(SPARK_LIFE_MAX - SPARK_LIFE_MIN > 0);

const hand = ryanHandPoint(400, 500, "right");
const shot = createBullet(hand.x, hand.y, 0);
assert.equal(shot.x, hand.x);
assert.equal(shot.y, hand.y);
assert.equal(shot.r, BULLET_RADIUS);
assert.equal(shot.vx, BULLET_SPEED);

function recorder() {
  const calls = [];
  const ctx = {
    calls,
    imageSmoothingEnabled: true,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    fillStyle: "#000",
    save() {
      calls.push(["save"]);
    },
    restore() {
      calls.push(["restore"]);
    },
    translate(x, y) {
      calls.push(["translate", x, y]);
      assert.equal(Number.isInteger(x), true, `translate x ${x}`);
      assert.equal(Number.isInteger(y), true, `translate y ${y}`);
    },
    rotate(a) {
      calls.push(["rotate", a]);
    },
    fillRect(x, y, w, h) {
      calls.push(["fillRect", x, y, w, h]);
      assert.equal(Number.isInteger(x), true, `x ${x}`);
      assert.equal(Number.isInteger(y), true, `y ${y}`);
      assert.equal(Number.isInteger(w), true, `w ${w}`);
      assert.equal(Number.isInteger(h), true, `h ${h}`);
    },
    drawImage() {
      calls.push(["drawImage"]);
    },
    beginPath() {
      calls.push(["beginPath"]);
    },
    arc() {
      calls.push(["arc"]);
    },
    fillText() {
      calls.push(["fillText"]);
    },
  };
  return ctx;
}

const fx = new BoltFx();
fx.sparkle(12.4, 8.2);
fx.puff(40.6, 18.8);
assert.ok(fx.burstCount > 0);
assert.ok(fx.burstCount <= BOLT_BURST_CAP);
for (const s of fx.sparks) {
  assert.ok(s.life >= SPARK_LIFE_MIN && s.life <= SPARK_LIFE_MAX, `life ${s.life}`);
  assert.equal(s.kind, "burst");
}

const ctx = recorder();
fx.draw(ctx, [shot], 0.2);
assert.equal(ctx.imageSmoothingEnabled, false);
assert.equal(ctx.calls.some((c) => c[0] === "drawImage"), false);
assert.equal(ctx.calls.some((c) => c[0] === "arc" || c[0] === "fillText" || c[0] === "beginPath"), false);
assert.ok(ctx.calls.some((c) => c[0] === "fillRect"));

const moving = createBullet(200, 200, 0);
const trail = new BoltFx();
trail.step([moving], 0.05);
assert.ok(trail.trailCount >= 1, "a flying bolt leaves sparks");
assert.ok(trail.trailCount <= BOLT_TRAIL_CAP);
for (const s of trail.sparks) {
  assert.ok(s.maxLife >= SPARK_LIFE_MIN && s.maxLife <= SPARK_LIFE_MAX, `maxLife ${s.maxLife}`);
  assert.ok(s.life > s.maxLife - 0.05 - 1e-6 && s.life <= s.maxLife);
  assert.ok(s.x < moving.x, "trail sits behind the bolt");
}

const storm = new BoltFx();
const bolts = [];
for (let i = 0; i < 48; i++) {
  const b = createBullet(100 + i, 100, (i / 48) * Math.PI * 2);
  bolts.push(b);
}
for (let n = 0; n < 90; n++) {
  for (const b of bolts) storm.sparkle(b.x, b.y);
  storm.step(bolts, 1 / 60);
}
assert.ok(storm.sparks.length <= BOLT_SPARK_CAP, `cap ${storm.sparks.length}`);
assert.ok(storm.trailCount <= BOLT_TRAIL_CAP);
assert.ok(storm.burstCount <= BOLT_BURST_CAP);
assert.equal(storm.trailCount + storm.burstCount, storm.sparks.length);

const fading = new BoltFx();
fading.puff(0, 0);
fading.step([], 0.45);
assert.equal(fading.sparks.length, 0);

let expired = 0;
const dying = [createBullet(100, 100, 0)];
dying[0].life = 0.01;
updateBullets(dying, 0.05, () => {
  expired += 1;
});
assert.equal(dying.length, 0);
assert.equal(expired, 1);

const boltSrc = fs.readFileSync(path.join(root, "js", "magic-bolts.js"), "utf8");
assert.equal(/BANG|POW|BOOM|ZAP|WHAM|KAPOW|KABOOM/.test(boltSrc), false);
assert.equal(boltSrc.includes("drawImage"), false);
assert.equal(boltSrc.includes("ryan.png"), false);

console.log("magic-bolt-uat: pixel bolts, cap", BOLT_SPARK_CAP);
