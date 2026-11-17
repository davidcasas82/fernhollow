# Ryan and the Siege of Fernhollow

A kid-friendly twin-stick courtyard game. Young Ryan holds the castle yard in his green hoodie and red neckerchief while mischievous forest creatures tumble over the walls. Move, aim, and fire sun-bolts. Scoop gold Sunseeds. If the courtyard holds, the crown shines on Fernhollow once more.

Brave and fun. No frights.

## Itch blurb

**Ryan and the Siege of Fernhollow**

The knights are away in the far meadows, and the golden crown is missing. Only Ryan stands on the cobblestones. Pufflings waddle in. Thistle Jays dash. Acorn Spinners orbit. Gust Blooms tug you closer with a playful puff of wind.

Sun-bolts send them packing. Scoop the Sunseeds they leave behind. At a high multiplier the bolts fly in a pair, then in a trio. Heart Apples and Royal Bursts are scarce treats. One long courtyard run, or eight short stages.

WASD to move. Mouse to aim. Hold click to fire. Space for a Royal Burst. Gamepad and touch work too. A bright kingdom story for young players.

## Play

From this folder:

```bash
npm start
```

Open the page the static server prints. ES modules need a server.

## Controls

| Action | Keyboard / mouse | Gamepad |
|--------|------------------|---------|
| Move | `W` `A` `S` `D` (or arrows) | Left stick / D-pad |
| Aim | Drag the mouse | Right stick |
| Fire | **Click and hold** | **RT** or **RB** |
| Royal Burst | `Space` or `B` | **LT** |
| Pause | `P` / `Esc` | **Start** |
| Sound | `M` | **Back** / Select |
| Again | Play Again / `R` after the courtyard grows quiet | **A** or **Start** |
| Title | **Title** on the quiet screen | — |
| Menu | `Enter` / arrows | **A**, **Start**, D-pad |

### Touch

| Action | Gesture |
|--------|---------|
| Move | Left thumb |
| Aim + fire | Right thumb, hold to fire |
| Royal Burst | **BURST** |
| Pause | **❚❚** |

Landscape is best. A rotate hint appears in portrait.

## The courtyard

- **Sunseeds** raise the multiplier. ×45 twin bolts. ×110 triple bolts. A bump keeps a seed.
- **Hearts** start at 3, cap at 5. **Royal Bursts** start at 3, cap at 5.
- **Courtyard** is one long run. **Stages** is eight short levels.
- Pufflings waddle. Thistle Jays dash. Acorn Spinners orbit. Moss Turtles soak bolts. Gust Blooms tug you in, then drop Sunseeds.

## Soundtrack

Original pulse, triangle, and noise music, synthesized in the game. Previews live in `docs/previews/audio/`.

| When | Loop |
|------|------|
| Title | Heroic |
| A fight, including the courtyard | Driving, and the bass leads |
| The boss stage | Heavier and faster |

Effects sit quieter than the music. Mute with `M`.

## Stack

- Vanilla HTML / CSS / JS (ES modules)
- Canvas 2D. Sprites are `drawImage` from the atlas, with smoothing off and an integer scale
- Web Audio music and effects, synthesized from the score
- Best score saved in this browser

Balance knobs live in `js/constants.js`.
