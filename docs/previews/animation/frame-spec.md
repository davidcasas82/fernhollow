# Missing animation frames

Do not draw these. The game already times the cells that exist. These names are the cells it does not have.

Existing cells stay as they are. Ryan uses `idle`, `walk0`–`walk3`, and `shoot` in rows `down`, `up`, `left`, `right` (80×96, anchor 40, 93, scale 1). Each enemy sheet already has four frames at the size below, facing right. Left is a flip. Frame 0 is the planted idle. The four frames are the walk. Attack, while a real attack cell is missing, retimes that walk. Hurt is a white flash on the current cell. Death is the four-frame poof on `fx.png` (64×64, 8 fps, play once).

## Ryan (`ryan.png`, 80×96)

| Frame | Size |
| --- | --- |
| `hurt_down` `hurt_up` `hurt_left` `hurt_right` | 80×96 |
| `death_down_0` `death_down_1` `death_down_2` `death_down_3` | 80×96 |
| `death_up_0` `death_up_1` `death_up_2` `death_up_3` | 80×96 |
| `death_left_0` `death_left_1` `death_left_2` `death_left_3` | 80×96 |
| `death_right_0` `death_right_1` `death_right_2` `death_right_3` | 80×96 |

## Enemies

Two attack frames, one hurt frame, four death frames. Same pixel size as that sheet. Anchor matches the sheet. Scale 1.

| Sheet | Attack | Hurt | Death | Size |
| --- | --- | --- | --- | --- |
| puffling | `attack_0` `attack_1` | `hurt` | `death_0` `death_1` `death_2` `death_3` | 56×56 |
| thistle-jay | `attack_0` `attack_1` | `hurt` | `death_0` `death_1` `death_2` `death_3` | 64×56 |
| fern-hare | `attack_0` `attack_1` | `hurt` | `death_0` `death_1` `death_2` `death_3` | 56×56 |
| acorn-spinner | `attack_0` `attack_1` | `hurt` | `death_0` `death_1` `death_2` `death_3` | 56×56 |
| split-sprout | `attack_0` `attack_1` | `hurt` | `death_0` `death_1` `death_2` `death_3` | 64×64 |
| sprout-bud | `attack_0` `attack_1` | `hurt` | `death_0` `death_1` `death_2` `death_3` | 40×40 |
| ivy-wisp | `attack_0` `attack_1` | `hurt` | `death_0` `death_1` `death_2` `death_3` | 40×48 |
| ivy-segment | `attack_0` `attack_1` | `hurt` | `death_0` `death_1` `death_2` `death_3` | 28×32 |
| moss-turtle | `attack_0` `attack_1` | `hurt` | `death_0` `death_1` `death_2` `death_3` | 80×56 |
| gust-bloom | `attack_0` `attack_1` | `hurt` | `death_0` `death_1` `death_2` `death_3` | 56×72 |
| pollen-puff | `attack_0` `attack_1` | `hurt` | `death_0` `death_1` `death_2` `death_3` | 28×28 |
| moss-giant | `attack_0` `attack_1` | `hurt` | `death_0` `death_1` `death_2` `death_3` | 128×96 |
