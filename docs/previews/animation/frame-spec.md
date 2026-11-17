# v3 animation frames

These cells are on the extra sheets in `v3_extras` and are drawn from those files. The game does not redraw them.

Walk and idle stay on the original sheets. Hurt, attack, and death play from the extra sheets at the sizes below. Enemies still flip the same way they did before. A hit also flashes white, knocks back, shakes a little, and puffs pixels. Death still plays the poof on `fx.png`.

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
