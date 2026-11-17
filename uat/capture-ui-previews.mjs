/**
 * Capture one still of each kingdom screen.
 * Run: node uat/capture-ui-previews.mjs
 */

import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "previews", "ui");
const base = process.env.UAT_URL || "http://127.0.0.1:5173";
const chrome = [
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((p) => fs.existsSync(p));

const shots = [
  ["title", "title", 400],
  ["main-menu", "menu", 400],
  ["pause", "pause", 700],
  ["settings", "settings", 400],
  ["controls", "help", 400],
  ["upgrades", "upgrades", 500],
  ["hud", "hud", 800],
  ["wave-banner", "banner", 800],
  ["game-over", "gameover", 800],
  ["victory", "victory", 800],
  ["credits", "credits", 400],
  ["loading", "loading", 300],
];

const require = createRequire(import.meta.url);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadPuppeteer() {
  try {
    return require("puppeteer-core");
  } catch {
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

async function main() {
  if (!chrome) throw new Error("No browser binary for previews");
  fs.mkdirSync(outDir, { recursive: true });
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1280,720"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    for (const [file, fn, wait] of shots) {
      await page.goto(base, { waitUntil: "networkidle0", timeout: 30000 });
      await page.waitForFunction(() => window.__fernScreens, { timeout: 15000 });
      await page.evaluate((name) => window.__fernScreens[name](), fn);
      await sleep(wait);
      const dest = path.join(outDir, `${file}.png`);
      await page.screenshot({ path: dest });
      console.log(file);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
