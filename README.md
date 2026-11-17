# Ryan and the Siege of Fernhollow

A kid-friendly twin-stick shooter. Ryan holds the castle courtyard, fires sun-bolts, and scoops **Sunseeds** while waves of forest creatures tumble in. Same loop as the original arena game: keyboard, mouse, gamepad, and touch.

Brave and fun. Not scary.

## Play now

**[▶ Play Ryan and the Siege of Fernhollow](https://davidcasas82.github.io/fernhollow/)**

Works on **desktop** (mouse/keyboard), **gamepad** (TV/couch), and **phone/tablet** (virtual twin-sticks — landscape recommended).

## Play locally

From this folder:

```bash
npm start
```

Then open **http://localhost:5173**

Or open `index.html` with any static file server (ES modules need a server, not `file://`).

## Controls

| Action | Keyboard / mouse | Gamepad |
|--------|------------------|---------|
| Move | `W` `A` `S` `D` (or arrows) | Left stick (analog speed) / D-pad |
| Aim | Drag trackpad / mouse (relative) | Right stick (absolute) |
| Fire | **Click and hold** left mouse | **RT** or **RB** (hold) |
| Royal Burst | `Space` or `B` | **LT** (also A / LB) |
| Pause | `P` / `Esc` | **Start** / Options |
| Mute | `M` | **Back** / Select / Share |
| Restart | Play Again / `R` after game over | **A** or **Start** |
| Title menu | **Title** on game over | — |
| Title PLAY | `Enter` / `Space` | **A** or **Start** |

### Touch (phone / tablet)

| Action | Gesture |
|--------|---------|
| Move | Left thumb — drag (virtual stick) |
| Aim + fire | Right thumb — drag to aim, hold to fire |
| Royal Burst | **BOMB** button |
| Pause | **❚❚** button |

Landscape is best. A rotate hint appears in portrait.

## How a run works

- **Sunseeds** — +1 multiplier each, ceiling 999. A hit keeps a recovery seed.
- **Sun-bolts** thicken with the multiplier — single until **×45 twin**, **×110 triple**.
- **Royal Bursts** clear the courtyard and score nothing. Start 3 / max 5.
- **Hearts** — start 3 / max 5.
- Waves breathe: bursts, lulls, and formations.

## Creatures

Behavior ids in code are unchanged. These are the looks:

| Look | Behavior |
|------|----------|
| Puffling | Slow pack-seek |
| Thistle Jay | Dashes in a straight line, then picks a new line |
| Fern Hare | Creeps, crouches, then hops |
| Acorn Spinner | Spirals and orbits |
| Split Sprout | Pops into two smaller sprouts |
| Ivy Wisp | A weaving vine of leaves |
| Moss Turtle | Slow, 3 hits |
| Gust Bloom | Plants, tugs Ryan closer, and sheds Pollen Puffs |
| Pollen Puff | Small and quick |

**Baron Bramble** is not in this build. His stomp, acorn bombs, and crown moment need their own encounter, and this pass does not rebuild the waves for a boss. The last stage still uses the existing elite: a big Moss Turtle.

## Soundtrack

The existing instrumental **Neon Swarm** is still wired up (two variants). A new chiptune is not in this build.

| File | When |
|------|------|
| `audio/neon-swarm-1.mp3` | Waves **1, 3, 5…** |
| `audio/neon-swarm-2.mp3` | Waves **2, 4, 6…** |

Tracks crossfade. Mute / `M` silences effects and music.

## Stack

- Vanilla HTML / CSS / JS (ES modules)
- Canvas 2D, nearest-neighbor pixel sprites
- Web Audio effects + HTMLAudioElement music loops
- LocalStorage for the high score

## Dev notes

Architecture and balance live in [`docs/BUILD_CONTEXT.md`](docs/BUILD_CONTEXT.md). Knobs live in `js/constants.js`. The signed-off look is in `docs/v2-mockups/`.

```bash
npm run uat
npm run smoke:frames
```

## Deploy (GitHub Pages)

This repo deploys from the `main` branch (site root).

| | |
|--|--|
| **Live game** | https://davidcasas82.github.io/fernhollow/ |
| **Source** | https://github.com/davidcasas82/fernhollow |
