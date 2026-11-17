# UI frames still needed

Do not draw these in code, and do not redraw, recolor, or approximate the atlas. Until a sheet exists, screens use the Press Start 2P pixel font, the kingdom palette below, and flat parchment panels. Sprites on screen stay `drawImage` from `assets/art/` at an integer scale with smoothing off.

Palette already in the game:

| Token | Hex |
|-------|-----|
| Night | `#14285a` |
| Ink | `#1a1420` |
| Parchment | `#f6e6c4` |
| Parchment light | `#fff4dc` |
| Parchment edge | `#e7d3a4` |
| Stone | `#8a6a45` |
| Stone dark | `#5a4636` |
| Stone light | `#c4b49a` |
| Gold | `#f0d24a` |
| Fern | `#3d9a4a` |
| Heart | `#d23b3b` |

## Keep using these frames

From `assets/art/fx.png`. Cell is 64×64. Do not crop into a new file.

| Name | Cell origin | Cell size | Drawn at |
|------|-------------|-----------|----------|
| Sun-bolt | `(0,0)` `(64,0)` `(128,0)` `(192,0)` | 64×64 | scale 1 |
| Sunseed | `(0,64)` `(64,64)` | 64×64 | scale 1 |
| Heart (hud 0) | `(0,320)` | 64×64, inner 16×16 | scale 1 |
| Heart Apple (hud 1) | `(64,320)` | 64×64, inner 16×16 | scale 1 |
| Spark (hud 2) | `(128,320)` | 64×64, inner 16×16 | scale 1 |

Title and courtyard stay `title-bg-named.png` and `courtyard.png`, both 1600×900. The title painting already says the game name. It has no PRESS START. PRESS START is the pixel font at scale 3.

## New sheet `assets/art/ui-frames.png`

Transparent background. Hard pixels. No text baked into the frames. No portrait.

Sheet layout, one row, cells touching:

| # | Name | Origin | Size | Notes |
|---|------|--------|------|-------|
| 1 | `panel-corner` | `(0,0)` | 12×12 | Outer 2px `#5a4636`, next 1px `#f0d24a`, rest `#f6e6c4`. Draw the top-left corner only. |
| 2 | `panel-edge-h` | `(12,0)` | 12×12 | Top edge tile. Same border weights. Repeat on x. |
| 3 | `panel-edge-v` | `(24,0)` | 12×12 | Left edge tile. Repeat on y. |
| 4 | `panel-fill` | `(36,0)` | 12×12 | Flat `#f6e6c4`. |
| 5 | `banner` | `(48,0)` | 160×32 | Wave ribbon. Stone end caps 16×32, parchment middle. No letters. |
| 6 | `bar-back` | `(208,0)` | 96×12 | Trough. 2px `#1a1420` outline, fill `#5a4636`. |
| 7 | `bar-heart` | `(304,0)` | 8×8 | Fill tile `#d23b3b`. Not a new heart. The heart icon stays hud 0. |
| 8 | `bar-sun` | `(312,0)` | 8×8 | Fill tile `#f0d24a`. |
| 9 | `cursor` | `(320,0)` | 12×12 | Menu pointer, points right. Gold `#f0d24a`, 1px ink outline. Hotspot `(0,6)`. |
| 10 | `button` | `(332,0)` | 96×24 | Fern `#3d9a4a` face, 2px ink outline, 1px parchment highlight on the top edge. No label. |
| 11 | `favicon` | `(428,0)` | 32×32 | Night field. A gold block and a fern block only, readable at 16×16. No face. |

The sheet is 460×32.

9-slice panels use frames 1–4. A menu panel assembles to 320×240 at scale 2 (source layout 160×120, corners 12). The wave banner draws frame 5 at scale 2 (320×64) with the pixel font centered in the parchment. Heart and Sunseed bars draw frame 6 at scale 2 (192×24) and fill with frames 7 and 8 repeated at scale 2. The menu cursor draws frame 9 at scale 2 (24×24) beside the focused row. The favicon is frame 11, also exported alone at 32×32 and 16×16.

Until that sheet lands, the cursor is the pixel-font glyph `>` and the panels are flat CSS in the colors above.
