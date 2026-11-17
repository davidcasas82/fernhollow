import { artBook } from "./art.js";
import { drawText, textWidth } from "./pixel-text.js";

const STORY =
  "While the knights of Fernhollow were away in the far meadows, a band of mischievous forest creatures slipped into the castle courtyard and made off with the kingdom's golden crown. Only young Ryan is brave enough to hold the courtyard with sun-bolts. Scoop the Sunseeds. If Ryan holds, the crown shines on Fernhollow once more.";

export function mountTitleScreen(canvas) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext("2d");
  let raf = 0;
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;

  const frame = (now) => {
    const book = artBook();
    const img = book?.titleNamed;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#14285a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (img) ctx.drawImage(img, 0, 0);
    const t = ((now || 0) - t0) / 1000;
    const blink =
      window.__holdPrompt ||
      (window.__showPressStart !== false && Math.floor(t * 2) % 2 === 0);
    if (blink) {
      const label = "PRESS START";
      const scale = 3;
      const tw = textWidth(label, scale);
      drawText(
        ctx,
        label,
        Math.round((canvas.width - tw) / 2),
        canvas.height - 46,
        scale,
        "#fff4dc",
        "#1a1420"
      );
    }
    raf = requestAnimationFrame(frame);
  };

  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

export { STORY };
