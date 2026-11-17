/**
 * Headless title + mid-game frames for the Fernhollow reskin.
 * Writes:
 *   /opt/cursor/artifacts/title-screen.png
 *   /opt/cursor/artifacts/gameplay.png
 * and, when that store is mounted, copies under
 *   /cursor/stores/self/media/
 *
 * Run: node uat/smoke-frames.mjs
 */

import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const BASE = process.env.UAT_URL || "http://127.0.0.1:5173";
const ART = "/opt/cursor/artifacts";
const MEDIA = "/cursor/stores/self/media";

const require = createRequire(import.meta.url);

function findChrome() {
  const list = [
    process.env.CHROME,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/local/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  for (const p of list) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("Chrome not found");
}

async function loadPuppeteer() {
  try {
    return require("puppeteer-core");
  } catch {
    console.log("Installing puppeteer-core…");
    await new Promise((resolve, reject) => {
      const p = spawn("npm", ["install", "--no-save", "puppeteer-core@23"], {
        cwd: root,
        stdio: "inherit",
      });
      p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("npm install failed"))));
    });
    return require("puppeteer-core");
  }
}

async function ensureServer() {
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(1500) });
    if (res.ok) return null;
  } catch {
    /* start one */
  }
  console.log("Starting local server…");
  const child = spawn("npx", ["--yes", "serve", "-l", "5173"], {
    cwd: root,
    stdio: "ignore",
    detached: true,
  });
  child.unref();
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const res = await fetch(BASE, { signal: AbortSignal.timeout(500) });
      if (res.ok) return child;
    } catch {
      /* retry */
    }
  }
  throw new Error("Could not start " + BASE);
}

function assertPng(file) {
  const buf = fs.readFileSync(file);
  const sig = buf.slice(0, 8).toString("hex");
  if (sig !== "89504e470d0a1a0a") throw new Error(file + " is not a PNG (" + sig + ")");
  if (buf.length < 8000) throw new Error(file + " is too small (" + buf.length + ")");
  console.log("  ok", file, buf.length, "bytes");
}

async function dressMidgame() {
  const g = window.__geometryArena;
  const { spawnEnemy, createGeom, createBullet } = await import("/js/entities.js");
  const { CAM } = await import("/js/camera.js");
  CAM.BASE_ZOOM = 1;
  CAM.MAX_ZOOM = 1;
  CAM.MIN_ZOOM = 1;
  g.start({ skipBgm: true });
  if (g.audio?.enabled !== false) g.toggleMute?.();
  g.cam.zoom = 1;
  g.cam.x = 800;
  g.cam.y = 450;
  g.cam.trauma = 0;
  g.elapsed = 70;
  g.time = 4;
  g.level = 4;
  g.mult = 12;
  g.peakMult = 12;
  g.score = 12840;
  g.player.invuln = 0;
  g.player.x = 800;
  g.player.y = 470;
  g.player.vx = 0;
  g.player.vy = 0;
  g.player.angle = 0;
  g.player.fireCd = 0;
  g.input.aim.x = 1;
  g.input.aim.y = 0;
  g.particles.clear();
  g.cam.trauma = 0;
  g.cam.zoomPunch = 0;
  g.lives = 3;
  g.bombs = 3;
  g.ui.updateScore(g.score);
  g.ui.updateMult(g.mult);
  g.ui.updateLevel?.(g.level);
  g.ui.updateLives(g.lives);
  g.ui.updateBombs?.(g.bombs);
  g.ui.updateGun?.(g.mult);

  const place = (type, x, y, angle = 0) => {
    const e = spawnEnemy(type, 80, { x, y });
    if (!e) return;
    e.enter = 1;
    e.approach = null;
    e.approachTime = 0;
    e.speed = 0;
    e.dashSpeed = 0;
    e.pull = 0;
    e.spawnCd = 99;
    e.angle = angle;
    e.x = x;
    e.y = y;
    g.enemies.push(e);
  };

  place("diamond", 250, 340, 0.4);
  place("diamond", 220, 520, 0.2);
  place("wanderer", 380, 300, 0);
  place("wanderer", 460, 390, 0);
  place("wanderer", 400, 500, 0);
  place("wanderer", 520, 430, 0);
  place("pink", 620, 300, 0.6);
  place("splitter", 1080, 300, Math.PI);
  place("spinner", 1180, 360, Math.PI);
  place("spinner", 1240, 480, Math.PI);
  place("tank", 900, 640, -1.2);
  place("void", 1320, 600, Math.PI);
  place("snake", 700, 640, 0.8);

  for (let i = 0; i < 4; i++) {
    g.geoms.push(createGeom(1360 + i * 16, 560));
  }
  g.bullets.push(createBullet(900, 460, 0.1));
  g.bullets.push(createBullet(940, 448, 0.02));

  g.enemies = g.enemies.filter((e) => e.speed === 0 || e.enter === 1);
  g.state = "paused";
  document.getElementById("overlay")?.classList.add("hidden");
  document.getElementById("splash")?.classList.add("hidden");
  if (g._draw) g._draw();
}

async function shot(page, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, type: "png", captureBeyondViewport: false });
  assertPng(file);
}

async function main() {
  fs.mkdirSync(ART, { recursive: true });
  await ensureServer();
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--window-size=1280,800"],
  });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(20000);
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#title-canvas");
    await page.waitForFunction(() => window.__titleReady === true);
    await new Promise((r) => setTimeout(r, 400));
    const titlePath = path.join(ART, "title-screen.png");
    await shot(page, titlePath);

    await page.click("#splash");
    await page.waitForSelector("#start-btn");
    await page.click("#start-btn");
    await page.waitForFunction(() => window.__geometryArena?.state === "playing");
    await page.evaluate(() => document.getElementById("splash")?.classList.add("hidden"));
    await page.evaluate(dressMidgame);
    await new Promise((r) => setTimeout(r, 250));
    const playPath = path.join(ART, "gameplay.png");
    await shot(page, playPath);

    if (fs.existsSync("/cursor/stores/self")) {
      fs.mkdirSync(MEDIA, { recursive: true });
      fs.copyFileSync(titlePath, path.join(MEDIA, "title-screen.png"));
      fs.copyFileSync(playPath, path.join(MEDIA, "gameplay.png"));
      assertPng(path.join(MEDIA, "title-screen.png"));
      assertPng(path.join(MEDIA, "gameplay.png"));
    }
    console.log("smoke frames ok");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
