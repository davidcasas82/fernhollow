/**
 * Original Fernhollow cues: three looping songs and the short effects.
 * Pulse leads, a moving triangle bass, and noise drums. Written for this game.
 */

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function pitch(name) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  let pc = PC[m[1]];
  if (m[2] === "#") pc += 1;
  if (m[2] === "b") pc -= 1;
  return (Number(m[3]) + 1) * 12 + pc;
}

const q = 1;
const e = 0.5;
const h = 2;

function phrase(bars, legato = 0.9) {
  let beat = 0;
  const events = [];
  bars.forEach((bar, bi) => {
    let local = 0;
    for (const item of bar) {
      const note = item[0];
      const dur = item[1];
      const vol = item[2] ?? 12;
      if (!(dur > 0)) throw new Error(`bar ${bi} has a bad duration`);
      if (note) {
        events.push({
          beat: beat + local,
          len: dur * legato,
          midi: pitch(note),
          vol,
        });
      }
      local += dur;
    }
    if (Math.abs(local - 4) > 1e-4) throw new Error(`bar ${bi} lasts ${local} beats`);
    beat += 4;
  });
  return events;
}

function eighths(rows) {
  const events = [];
  rows.forEach((row, bi) => {
    if (row.length !== 8) throw new Error(`bass bar ${bi} has ${row.length} notes`);
    row.forEach((note, i) => {
      if (!note) return;
      events.push({
        beat: bi * 4 + i * 0.5,
        len: 0.4,
        midi: pitch(note),
        vol: i === 0 ? 15 : 12,
      });
    });
  });
  return events;
}

function secToBeats(seconds, bpm) {
  return (seconds * bpm) / 60;
}

function kick(beat, bpm) {
  const click = secToBeats(0.012, bpm);
  const body = secToBeats(0.068, bpm);
  return [
    { beat, len: click, noise: 2, mode: "short", vol: 9, pri: 3 },
    {
      beat: beat + click,
      len: body,
      noise: 11,
      slideNoise: 15,
      mode: "long",
      vol: 14,
      pri: 3,
      drum: "kick",
    },
  ];
}

function snare(beat, bpm, vol = 12) {
  const click = secToBeats(0.01, bpm);
  const body = secToBeats(0.07, bpm);
  return [
    { beat, len: click, noise: 3, mode: "short", vol: Math.max(4, vol - 3), pri: 2 },
    {
      beat: beat + click,
      len: body,
      noise: 8,
      mode: "short",
      vol,
      pri: 2,
      drum: "snare",
    },
  ];
}

function hat(beat, bpm, open = false) {
  return [
    {
      beat,
      len: secToBeats(open ? 0.08 : 0.026, bpm),
      noise: open ? 4 : 1,
      mode: "short",
      vol: open ? 7 : 5,
      pri: open ? 1 : 0,
      drum: open ? "open" : "hat",
    },
  ];
}

function layoutDrums(events) {
  const ordered = events.slice().sort((a, b) => b.pri - a.pri || a.beat - b.beat);
  const placed = [];
  for (const ev of ordered) {
    const end = ev.beat + ev.len;
    const hit = placed.some((p) => ev.beat < p.beat + p.len - 1e-4 && end > p.beat + 1e-4);
    if (!hit) placed.push(ev);
  }
  placed.sort((a, b) => a.beat - b.beat);
  return placed;
}

function heroicDrums(bars, bpm) {
  const events = [];
  for (let b = 0; b < bars; b++) {
    const t = b * 4;
    events.push(...kick(t, bpm), ...kick(t + 2, bpm));
    events.push(...snare(t + 1, bpm), ...snare(t + 3, bpm, 11));
    for (let i = 0; i < 8; i++) events.push(...hat(t + i * 0.5, bpm));
    if (b === 3 || b === bars - 1) {
      events.push(...snare(t + 3.25, bpm, 8), ...snare(t + 3.5, bpm, 9), ...snare(t + 3.75, bpm, 10));
    }
    if (b === 7 || b === 11 || b === 15) events.push(...hat(t + 3.55, bpm, true));
  }
  return layoutDrums(events);
}

function yardDrums(bars, bpm) {
  const events = [];
  for (let b = 0; b < bars; b++) {
    const t = b * 4;
    for (const off of [0, 1.5, 2, 3.5]) events.push(...kick(t + off, bpm));
    events.push(...snare(t + 1, bpm, 13), ...snare(t + 3, bpm, 13));
    for (let i = 0; i < 16; i++) events.push(...hat(t + i * 0.25, bpm));
    if (b % 2 === 1) events.push(...hat(t + 3.2, bpm, true));
  }
  return layoutDrums(events);
}

function bossDrums(bars, bpm) {
  const events = [];
  for (let b = 0; b < bars; b++) {
    const t = b * 4;
    for (const off of [0, 0.75, 2, 2.75]) events.push(...kick(t + off, bpm));
    events.push(...snare(t + 1, bpm, 13), ...snare(t + 3, bpm, 13));
    if (b % 2 === 1) events.push(...snare(t + 3.5, bpm, 8));
    const step = b >= 12 ? 0.25 : 0.5;
    const count = b >= 12 ? 16 : 8;
    for (let i = 0; i < count; i++) events.push(...hat(t + i * step, bpm));
    if (b === 4 || b === 12 || b === 20) events.push(...hat(t, bpm, true));
  }
  return layoutDrums(events);
}

function musicVoices({ duty1, duty2, bassDecay, leadDecay, vib, dutyLfo }) {
  return {
    pulse1: {
      kind: "pulse",
      duty: duty1,
      dutyLfo: dutyLfo || null,
      fc: 4400,
      attack: 0.006,
      release: 0.026,
      decay: leadDecay,
      vibDepth: vib,
      vibRate: 5.3,
      vibDelay: 0.1,
    },
    pulse2: {
      kind: "pulse",
      duty: duty2,
      fc: 3600,
      attack: 0.005,
      release: 0.022,
      decay: leadDecay + 0.4,
      vibDepth: 0,
      vibRate: 5,
      vibDelay: 0,
    },
    triangle: {
      kind: "triangle",
      fc: 3600,
      attack: 0.003,
      release: 0.016,
      decay: bassDecay,
      vibDepth: 0,
      vibRate: 0,
      vibDelay: 0,
    },
    noise: {
      kind: "noise",
      fc: 9000,
      attack: 0.001,
      release: 0.01,
      decay: 12,
      vibDepth: 0,
      vibRate: 0,
      vibDelay: 0,
    },
  };
}

const REST = [[null, 4]];

const titleLead = phrase([
  [
    ["D5", q, 13],
    ["A5", e, 12],
    ["F#5", e, 12],
    ["A5", q, 13],
    ["D6", q, 13],
  ],
  [
    ["D5", e, 12],
    ["G5", q, 13],
    ["B5", e, 12],
    ["A5", q, 12],
    ["G5", q, 12],
  ],
  [
    ["F#5", q, 13],
    ["A5", e, 12],
    ["D6", e, 13],
    ["C#6", q, 12],
    ["A5", q, 12],
  ],
  [
    ["A5", e, 12],
    ["G5", e, 11],
    ["F#5", e, 11],
    ["E5", e, 11],
    ["D5", e, 12],
    ["C#5", e, 11],
    ["D5", q, 12],
  ],
  [
    ["D5", e, 13],
    ["A4", e, 11],
    ["B4", e, 12],
    ["D5", e, 12],
    ["F#5", q, 13],
    ["E5", q, 12],
  ],
  [
    ["B4", e, 12],
    ["D5", e, 12],
    ["G5", e, 13],
    ["F#5", e, 12],
    ["E5", q, 12],
    ["D5", q, 12],
  ],
  [
    ["E5", e, 12],
    ["F#5", e, 12],
    ["A5", e, 13],
    ["B5", e, 12],
    ["A5", q, 13],
    ["E5", q, 12],
  ],
  [
    ["F#5", q, 13],
    ["D5", e, 12],
    ["E5", e, 12],
    ["D5", h, 13],
  ],
  [
    ["F#5", e, 12],
    ["A5", e, 13],
    ["D6", e, 13],
    ["C#6", e, 12],
    ["B5", q, 13],
    ["A5", q, 12],
  ],
  [
    ["G5", e, 12],
    ["B5", e, 13],
    ["A5", e, 12],
    ["G5", e, 12],
    ["F#5", q, 12],
    ["E5", q, 11],
  ],
  [
    ["E5", e, 12],
    ["F#5", e, 12],
    ["A5", e, 13],
    ["B5", e, 12],
    ["C#6", q, 13],
    ["A5", q, 12],
  ],
  [
    ["F#5", q, 13],
    ["E5", q, 12],
    ["D5", h, 13],
  ],
  [
    ["D5", q, 12],
    ["G5", e, 13],
    ["F#5", e, 12],
    ["E5", q, 12],
    ["D5", q, 12],
  ],
  [
    ["F#5", e, 12],
    ["A5", e, 13],
    ["D5", e, 12],
    ["F#5", e, 12],
    ["A5", q, 13],
    ["F#5", q, 12],
  ],
  [
    ["G5", e, 12],
    ["E5", e, 12],
    ["B4", e, 11],
    ["E5", e, 12],
    ["D5", q, 12],
    ["B4", q, 11],
  ],
  [
    ["C#5", q, 12],
    ["E5", q, 12],
    ["A5", e, 13],
    ["G5", e, 11],
    ["F#5", e, 12],
    ["E5", e, 12],
  ],
  [
    ["A5", q, 13],
    ["F#5", e, 12],
    ["G5", e, 12],
    ["A5", q, 13],
    ["D5", q, 12],
  ],
  [
    ["B5", e, 13],
    ["A5", e, 12],
    ["G5", e, 12],
    ["F#5", e, 12],
    ["E5", q, 12],
    ["D5", e, 11],
    ["B4", e, 11],
  ],
  [
    ["A4", e, 11],
    ["C#5", e, 12],
    ["E5", e, 12],
    ["A5", e, 13],
    ["F#5", q, 12],
    ["E5", q, 12],
  ],
  [
    ["F#5", q, 13],
    ["E5", q, 12],
    ["D5", q, 13],
    [null, q],
  ],
]);

const titleHarmony = phrase(
  [
    [
      ["D4", q, 8],
      ["F#4", q, 8],
      ["A4", q, 9],
      ["F#4", q, 8],
    ],
    [
      ["G4", q, 8],
      ["B4", q, 8],
      ["D5", q, 9],
      ["B4", q, 8],
    ],
    [
      ["A4", q, 8],
      ["D5", e, 9],
      ["F#5", e, 8],
      ["A4", q, 8],
      ["F#4", q, 8],
    ],
    [
      ["E4", q, 8],
      ["C#5", q, 8],
      ["A4", q, 8],
      ["E4", q, 8],
    ],
    [
      ["F#4", q, 8],
      ["A4", q, 8],
      ["D5", q, 9],
      ["A4", q, 8],
    ],
    [
      ["G4", q, 8],
      ["B4", q, 8],
      ["D5", q, 8],
      ["B4", q, 8],
    ],
    [
      ["A4", q, 8],
      ["C#5", q, 8],
      ["E5", q, 9],
      ["C#5", q, 8],
    ],
    [
      ["A4", q, 8],
      ["F#4", q, 8],
      ["D4", h, 8],
    ],
    [
      ["B4", q, 8],
      ["D5", q, 8],
      ["F#5", q, 9],
      ["D5", q, 8],
    ],
    [
      ["G4", q, 8],
      ["B4", q, 8],
      ["D5", q, 8],
      ["B4", q, 8],
    ],
    [
      ["A4", q, 8],
      ["C#5", q, 8],
      ["E5", q, 9],
      ["C#5", q, 8],
    ],
    [
      ["A4", q, 8],
      ["F#4", q, 8],
      ["D4", h, 8],
    ],
    [
      ["B4", q, 8],
      ["D5", q, 8],
      ["G4", q, 8],
      ["B4", q, 8],
    ],
    [
      ["D5", q, 9],
      ["A4", q, 8],
      ["F#4", q, 8],
      ["A4", q, 8],
    ],
    [
      ["E4", q, 8],
      ["G4", q, 8],
      ["B4", q, 8],
      ["G4", q, 8],
    ],
    [
      ["A4", q, 8],
      ["C#5", q, 8],
      ["E5", e, 8],
      ["C#5", e, 8],
      ["A4", e, 8],
      ["C#5", e, 8],
    ],
    [
      ["F#4", q, 8],
      ["B4", q, 8],
      ["D5", q, 8],
      ["F#4", q, 8],
    ],
    [
      ["G4", q, 8],
      ["B4", q, 8],
      ["D5", q, 8],
      ["G4", q, 8],
    ],
    [
      ["A4", q, 8],
      ["C#5", q, 8],
      ["E5", q, 9],
      ["C#5", q, 8],
    ],
    [
      ["A4", q, 8],
      ["F#4", q, 8],
      ["D4", q, 9],
      [null, q],
    ],
  ],
  0.82
);

const titleBass = eighths([
  ["D2", "F#2", "A2", "D3", "C#3", "A2", "F#2", "D2"],
  ["G2", "B2", "D3", "G2", "F#2", "D3", "B2", "G2"],
  ["D2", "A2", "D3", "F#3", "E3", "C#3", "A2", "F#2"],
  ["A2", "C#3", "E3", "A2", "G2", "F#2", "E2", "C#2"],
  ["D2", "A2", "D3", "A2", "F#2", "A2", "D3", "F#2"],
  ["G2", "D3", "B2", "G2", "B2", "D3", "G3", "D3"],
  ["A2", "E2", "A2", "C#3", "E3", "C#3", "A2", "E2"],
  ["D2", "F#2", "A2", "D3", "A2", "F#2", "D2", "A2"],
  ["B2", "F#2", "B2", "D3", "F#3", "D3", "B2", "A2"],
  ["G2", "B2", "D3", "B2", "A2", "G2", "F#2", "G2"],
  ["A2", "C#3", "E3", "A2", "G2", "F#2", "E2", "A2"],
  ["D2", "A2", "F#2", "A2", "D3", "A2", "F#2", "D2"],
  ["G2", "B2", "D3", "G3", "F#3", "D3", "B2", "G2"],
  ["D2", "F#2", "A2", "D3", "C#3", "D3", "E3", "F#3"],
  ["E2", "G2", "B2", "E3", "D3", "B2", "G2", "E2"],
  ["A2", "E3", "C#3", "A2", "B2", "C#3", "D3", "E3"],
  ["B2", "D3", "F#3", "B2", "A2", "F#2", "D2", "B2"],
  ["G2", "B2", "D3", "G2", "F#2", "E2", "D2", "B2"],
  ["A2", "C#3", "E3", "G3", "F#3", "E3", "C#3", "A2"],
  ["F#2", "E2", "D2", "A2", "D2", "F#2", null, null],
]);

const YARD_RIFF = [
  [0.0, 0, 0.2, 15],
  [0.25, 0, 0.14, 11],
  [0.5, 3, 0.18, 14],
  [0.75, 0, 0.14, 12],
  [1.0, -5, 0.22, 14],
  [1.5, -2, 0.16, 12],
  [1.75, 0, 0.16, 12],
  [2.0, 3, 0.2, 14],
  [2.5, 7, 0.2, 15],
  [2.75, 3, 0.14, 11],
  [3.0, 0, 0.2, 13],
  [3.5, -2, 0.16, 12],
  [3.75, -5, 0.14, 11],
  [4.0, 0, 0.18, 15],
  [4.25, 3, 0.14, 12],
  [4.5, 7, 0.16, 13],
  [4.75, 10, 0.16, 14],
  [5.0, 12, 0.28, 15],
  [5.5, 7, 0.16, 12],
  [5.75, 3, 0.14, 11],
  [6.0, 5, 0.22, 14],
  [6.5, 3, 0.16, 12],
  [6.75, 0, 0.16, 12],
  [7.0, -2, 0.18, 13],
  [7.25, -5, 0.14, 11],
  [7.55, 0, 0.2, 14],
];

const YARD_TURN = [
  [0.0, 0, 0.22, 15],
  [0.5, 3, 0.18, 13],
  [1.0, 5, 0.18, 13],
  [1.5, 7, 0.18, 14],
  [2.0, 10, 0.2, 14],
  [2.5, 12, 0.22, 15],
  [3.0, 10, 0.18, 12],
  [3.5, 7, 0.16, 12],
  [4.0, 5, 0.18, 13],
  [4.5, 3, 0.16, 12],
  [5.0, 2, 0.16, 12],
  [5.5, 0, 0.18, 13],
  [6.0, -2, 0.2, 14],
  [6.5, -5, 0.2, 13],
  [7.0, -7, 0.22, 12],
  [7.5, -5, 0.2, 14],
];

const YARD_PLAN = ["A", "A", "A", "A", "D", "A", "C", "A", "A", "A", "G", "TURN"];
const YARD_ROOT = { A: pitch("A2"), D: pitch("D3"), C: pitch("C3"), G: pitch("G2") };
const YARD_COLOR = { A: "E4", D: "A4", C: "G4", G: "D4", TURN: "E4" };

function stampPattern(start, rootMidi, pattern) {
  return pattern.map(([off, semi, len, vol]) => {
    const midi = rootMidi + semi;
    const ev = { beat: start + off, len, midi, vol };
    if (vol >= 15) ev.slideTo = midi - 1;
    return ev;
  });
}

function sustain(events, factor) {
  const sorted = events.slice().sort((a, b) => a.beat - b.beat);
  for (let i = 0; i < sorted.length; i++) {
    const next = sorted[i + 1] ? sorted[i + 1].beat : sorted[i].beat + sorted[i].len;
    const room = next - sorted[i].beat - 0.02;
    sorted[i] = { ...sorted[i], len: Math.min(Math.max(sorted[i].len, room), sorted[i].len * factor) };
    if (sorted[i].len > room) sorted[i].len = Math.max(0.04, room);
  }
  return sorted;
}

const yardBass = sustain(
  YARD_PLAN.flatMap((name, i) => {
    const pattern = name === "TURN" ? YARD_TURN : YARD_RIFF;
    const root = name === "TURN" ? YARD_ROOT.A : YARD_ROOT[name];
    return stampPattern(i * 8, root, pattern);
  }),
  1.85
);

const yardColor = YARD_PLAN.flatMap((name, i) => {
  const note = pitch(YARD_COLOR[name]);
  const events = [];
  for (let bar = 0; bar < 2; bar++) {
    const base = i * 8 + bar * 4;
    for (let k = 0; k < 4; k++) {
      events.push({ beat: base + k + 0.5, len: 0.1, midi: note, vol: 6 });
    }
  }
  return events;
});

const yardHook = [
  [
    [null, e],
    ["E5", e, 11],
    ["G5", e, 11],
    ["A5", q, 12],
    [null, e],
    [null, q],
  ],
  [
    ["C6", e, 12],
    ["A5", e, 11],
    ["G5", q, 11],
    ["E5", h, 10],
  ],
  [
    ["E5", e, 11],
    ["G5", e, 11],
    ["B5", q, 12],
    ["A5", e, 11],
    ["G5", e, 10],
    ["E5", q, 10],
  ],
  [
    ["D5", e, 10],
    ["E5", e, 11],
    ["G5", e, 11],
    ["E5", e, 10],
    ["A5", q, 12],
    [null, q],
  ],
];

const yardAnswer = [
  [
    [null, e],
    ["G5", e, 11],
    ["A5", e, 11],
    ["C6", q, 12],
    [null, e],
    [null, q],
  ],
  [
    ["E6", e, 12],
    ["C6", e, 11],
    ["A5", q, 11],
    ["G5", h, 10],
  ],
  [
    ["G5", e, 11],
    ["A5", e, 11],
    ["B5", q, 12],
    ["A5", e, 10],
    ["G5", e, 10],
    ["E5", q, 10],
  ],
  [
    ["E5", e, 10],
    ["D5", e, 10],
    ["C5", e, 10],
    ["D5", e, 10],
    ["E5", q, 11],
    [null, q],
  ],
];

const yardClose = [
  [
    ["A5", q, 12],
    ["G5", e, 11],
    ["E5", e, 10],
    ["C6", q, 12],
    ["A5", q, 11],
  ],
  [
    ["B5", e, 11],
    ["A5", e, 10],
    ["G5", e, 10],
    ["E5", e, 10],
    ["D5", q, 11],
    ["E5", q, 11],
  ],
  [
    ["E5", e, 11],
    ["G5", e, 11],
    ["A5", e, 12],
    ["C6", e, 12],
    ["B5", q, 11],
    ["A5", q, 11],
  ],
  [
    ["G5", q, 11],
    ["E5", q, 10],
    ["A5", q, 12],
    [null, q],
  ],
];

const yardLead = phrase([
  REST,
  REST,
  REST,
  REST,
  ...yardHook,
  ...yardHook,
  ...yardAnswer,
  ...yardHook,
  ...yardClose,
]);

const BOSS_ROOTS = [
  "E2",
  "E2",
  "E2",
  "D2",
  "E2",
  "E2",
  "C2",
  "C2",
  "D2",
  "D2",
  "E2",
  "E2",
  "G2",
  "D2",
  "C2",
  "B2",
  "E2",
  "C2",
  "D2",
  "E2",
  "G2",
  "D2",
  "C2",
  "B2",
  "E2",
  "D2",
  "B2",
  "E2",
];

const BOSS_FILL = {
  E2: ["B2", "C3", "D3"],
  C2: ["G2", "A2", "B2"],
  D2: ["A2", "B2", "C3"],
  G2: ["D3", "E3", "F#3"],
  B2: ["F#2", "G2", "A2"],
};

function bossBass(roots) {
  const events = [];
  roots.forEach((root, bi) => {
    const base = bi * 4;
    const low = pitch(root);
    for (let beat = 0; beat < 3; beat++) {
      const t = base + beat;
      events.push({ beat: t, len: 0.16, midi: low, vol: 15, slideTo: low - 1 });
      events.push({ beat: t + 0.5, len: 0.1, midi: low, vol: 11 });
      events.push({ beat: t + 0.72, len: 0.12, midi: low + 12, vol: 14 });
    }
    BOSS_FILL[root].forEach((note, i) => {
      events.push({
        beat: base + 3 + i * 0.25,
        len: 0.16,
        midi: pitch(note),
        vol: i === 0 ? 14 : 12,
      });
    });
  });
  return events;
}

function bossHarmony(roots) {
  const events = [];
  roots.forEach((root, bi) => {
    const midi = pitch(root) + 12;
    for (let k = 0; k < 4; k++) {
      events.push({ beat: bi * 4 + k + 0.5, len: 0.12, midi, vol: 8 });
    }
  });
  return events;
}

const bossStab = [
  ["E4", 0.25, 13],
  [null, 0.75],
  ["B4", 0.25, 12],
  [null, 0.75],
  ["E5", 0.25, 13],
  [null, 0.75],
  ["D5", 0.25, 11],
  [null, 0.75],
];

const bossLead = phrase([
  bossStab,
  bossStab,
  bossStab,
  [
    ["E4", e, 12],
    ["G4", e, 12],
    ["B4", e, 13],
    ["E5", e, 13],
    ["D5", e, 12],
    ["B4", e, 12],
    ["G4", e, 11],
    ["E4", e, 11],
  ],
  [
    ["B4", q, 13],
    ["G4", e, 12],
    ["A4", e, 12],
    ["B4", q, 13],
    ["E5", q, 13],
  ],
  [
    ["D5", e, 12],
    ["B4", e, 12],
    ["A4", e, 11],
    ["G4", e, 11],
    ["A4", q, 12],
    ["E4", q, 12],
  ],
  [
    ["E5", q, 13],
    ["G5", e, 12],
    ["E5", e, 12],
    ["D5", q, 12],
    ["C5", q, 12],
  ],
  [
    ["B4", e, 12],
    ["C5", e, 12],
    ["D5", e, 12],
    ["E5", e, 13],
    ["C5", h, 12],
  ],
  [
    ["F#5", q, 13],
    ["A5", e, 12],
    ["F#5", e, 12],
    ["E5", q, 12],
    ["D5", q, 12],
  ],
  [
    ["A4", q, 12],
    ["D5", q, 13],
    ["F#5", q, 12],
    ["E5", q, 12],
  ],
  [
    ["E5", e, 12],
    ["G5", e, 13],
    ["B5", q, 13],
    ["A5", e, 12],
    ["G5", e, 12],
    ["E5", q, 12],
  ],
  [
    ["D5", q, 12],
    ["B4", q, 12],
    ["E5", h, 13],
  ],
  [
    ["B4", e, 12],
    ["D5", e, 12],
    ["G5", e, 13],
    ["A5", e, 12],
    ["B5", q, 13],
    ["G5", q, 12],
  ],
  [
    ["A5", e, 12],
    ["F#5", e, 12],
    ["D5", e, 11],
    ["F#5", e, 12],
    ["A5", q, 13],
    ["F#5", q, 12],
  ],
  [
    ["G5", e, 12],
    ["E5", e, 12],
    ["C5", e, 11],
    ["E5", e, 12],
    ["G5", e, 13],
    ["A5", e, 12],
    ["G5", e, 12],
    ["E5", e, 11],
  ],
  [
    ["F#5", e, 12],
    ["D5", e, 12],
    ["B4", e, 11],
    ["D5", e, 12],
    ["F#5", q, 13],
    ["D5", q, 12],
  ],
  [
    ["E5", e, 12],
    ["G5", e, 13],
    ["B5", e, 13],
    ["E6", e, 13],
    ["D6", e, 12],
    ["B5", e, 12],
    ["A5", e, 11],
    ["G5", e, 11],
  ],
  [
    ["E5", e, 12],
    ["G5", e, 12],
    ["C6", q, 13],
    ["B5", e, 12],
    ["A5", e, 12],
    ["G5", q, 12],
  ],
  [
    ["F#5", e, 12],
    ["A5", e, 13],
    ["D6", e, 13],
    ["A5", e, 12],
    ["G5", q, 12],
    ["F#5", q, 12],
  ],
  [
    ["E5", q, 13],
    ["B4", q, 12],
    ["E5", h, 13],
  ],
  [
    ["B5", q, 13],
    ["G5", e, 12],
    ["A5", e, 12],
    ["B5", q, 13],
    ["D6", q, 13],
  ],
  [
    ["A5", q, 12],
    ["F#5", e, 12],
    ["G5", e, 12],
    ["A5", q, 13],
    ["D5", q, 12],
  ],
  [
    ["G5", e, 12],
    ["A5", e, 12],
    ["C6", e, 13],
    ["E6", e, 13],
    ["D6", q, 12],
    ["C6", q, 12],
  ],
  [
    ["B5", q, 13],
    ["A5", q, 12],
    ["G5", q, 12],
    ["F#5", q, 12],
  ],
  [
    ["E5", q, 13],
    ["G5", e, 12],
    ["B5", e, 13],
    ["E6", q, 13],
    ["B5", q, 12],
  ],
  [
    ["C6", e, 12],
    ["B5", e, 12],
    ["A5", e, 11],
    ["G5", e, 11],
    ["A5", q, 12],
    ["E5", q, 12],
  ],
  [
    ["F#5", e, 12],
    ["A5", e, 13],
    ["D6", e, 13],
    ["A5", e, 12],
    ["G5", q, 12],
    ["F#5", q, 12],
  ],
  [
    ["E5", q, 13],
    ["B4", q, 12],
    ["E5", q, 13],
    [null, q],
  ],
]);

function song(partial) {
  const bars = partial.bars;
  const total = bars * 4;
  const channels = {
    pulse1: partial.channels.pulse1,
    pulse2: partial.channels.pulse2,
    triangle: partial.channels.triangle,
    noise: partial.channels.noise,
  };
  for (const [name, events] of Object.entries(channels)) {
    events.sort((a, b) => a.beat - b.beat);
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ev.beat < -1e-6 || ev.beat + ev.len > total + 1e-3) {
        throw new Error(`${partial.id} ${name} leaves the loop at ${ev.beat}`);
      }
      if (i && events[i - 1].beat + events[i - 1].len > ev.beat + 1e-4) {
        throw new Error(`${partial.id} ${name} overlaps at ${ev.beat}`);
      }
    }
  }
  return {
    id: partial.id,
    title: partial.title,
    bpm: partial.bpm,
    bars,
    normalize: true,
    peak: 0.88,
    drive: partial.drive,
    width: partial.width,
    loopFade: 12,
    mix: partial.mix,
    voice: partial.voice,
    channels,
  };
}

export const TRACKS = {
  title: song({
    id: "title",
    title: "Green Banner",
    bpm: 120,
    bars: 20,
    drive: 1.05,
    width: 0.18,
    mix: { pulse1: 0.36, pulse2: 0.16, triangle: 0.3, noise: 0.14 },
    voice: musicVoices({
      duty1: 0.5,
      duty2: 0.25,
      bassDecay: 3.2,
      leadDecay: 0.55,
      vib: 0.007,
      dutyLfo: { rate: 0.16, depth: 0.05 },
    }),
    channels: {
      pulse1: titleLead,
      pulse2: titleHarmony,
      triangle: titleBass,
      noise: heroicDrums(20, 120),
    },
  }),
  courtyard: song({
    id: "courtyard",
    title: "Yard Rush",
    bpm: 150,
    bars: 24,
    drive: 1.08,
    width: 0.16,
    mix: { pulse1: 0.26, pulse2: 0.09, triangle: 0.58, noise: 0.16 },
    voice: musicVoices({
      duty1: 0.25,
      duty2: 0.125,
      bassDecay: 2.2,
      leadDecay: 0.7,
      vib: 0.005,
    }),
    channels: {
      pulse1: yardLead,
      pulse2: yardColor,
      triangle: yardBass,
      noise: yardDrums(24, 150),
    },
  }),
  boss: song({
    id: "boss",
    title: "Moss Drum",
    bpm: 168,
    bars: 28,
    drive: 1.12,
    width: 0.14,
    mix: { pulse1: 0.24, pulse2: 0.14, triangle: 0.52, noise: 0.26 },
    voice: musicVoices({
      duty1: 0.125,
      duty2: 0.25,
      bassDecay: 3.4,
      leadDecay: 0.45,
      vib: 0.004,
    }),
    channels: {
      pulse1: bossLead,
      pulse2: bossHarmony(BOSS_ROOTS),
      triangle: bossBass(BOSS_ROOTS),
      noise: bossDrums(28, 168),
    },
  }),
};

function sfxVoices() {
  return {
    pulse1: {
      kind: "pulse",
      duty: 0.25,
      fc: 5200,
      attack: 0.002,
      release: 0.012,
      decay: 1.4,
      vibDepth: 0,
      vibRate: 5,
      vibDelay: 0,
    },
    pulse2: {
      kind: "pulse",
      duty: 0.5,
      fc: 4800,
      attack: 0.002,
      release: 0.012,
      decay: 1.4,
      vibDepth: 0,
      vibRate: 5,
      vibDelay: 0,
    },
    triangle: {
      kind: "triangle",
      fc: 2800,
      attack: 0.002,
      release: 0.014,
      decay: 2.2,
      vibDepth: 0,
      vibRate: 0,
      vibDelay: 0,
    },
    noise: {
      kind: "noise",
      fc: 8600,
      attack: 0.001,
      release: 0.012,
      decay: 3.5,
      vibDepth: 0,
      vibRate: 0,
      vibDelay: 0,
    },
  };
}

function cue(channels) {
  let end = 0.04;
  for (const list of Object.values(channels)) {
    for (const ev of list || []) end = Math.max(end, ev.beat + ev.len);
  }
  return {
    bpm: 60,
    seconds: end + 0.02,
    normalize: false,
    peak: 0.3,
    drive: 1,
    width: 0.1,
    mix: { pulse1: 0.18, pulse2: 0.12, triangle: 0.2, noise: 0.16 },
    voice: sfxVoices(),
    channels: {
      pulse1: channels.pulse1 || [],
      pulse2: channels.pulse2 || [],
      triangle: channels.triangle || [],
      noise: channels.noise || [],
    },
  };
}

function tone(beat, note, len, vol, slideTo = null) {
  const ev = { beat, len, midi: pitch(note), vol };
  if (slideTo) ev.slideTo = pitch(slideTo);
  return ev;
}

export const SFX = {
  shoot: cue({
    pulse1: [tone(0, "C7", 0.045, 6, "G5")],
    noise: [{ beat: 0, len: 0.07, noise: 3, slideNoise: 11, mode: "long", vol: 6 }],
  }),
  hit: cue({
    triangle: [tone(0, "G4", 0.03, 6)],
    noise: [{ beat: 0, len: 0.05, noise: 9, mode: "short", vol: 7 }],
  }),
  enemyDeath: cue({
    pulse1: [tone(0, "E5", 0.04, 6), tone(0.05, "C5", 0.04, 5), tone(0.1, "G4", 0.05, 5)],
    triangle: [tone(0, "A3", 0.16, 6, "E2")],
    noise: [{ beat: 0, len: 0.16, noise: 4, slideNoise: 14, mode: "long", vol: 7 }],
  }),
  pickup: cue({
    pulse1: [tone(0, "A5", 0.04, 6), tone(0.05, "C6", 0.04, 6), tone(0.1, "E6", 0.07, 7)],
  }),
  levelUp: cue({
    pulse1: [
      tone(0, "C5", 0.08, 6),
      tone(0.09, "E5", 0.08, 6),
      tone(0.18, "G5", 0.08, 7),
      tone(0.27, "C6", 0.12, 7),
    ],
  }),
  menuMove: cue({
    pulse1: [tone(0, "A5", 0.02, 4)],
  }),
  menuSelect: cue({
    pulse1: [tone(0, "G5", 0.04, 5), tone(0.05, "C6", 0.06, 6)],
  }),
  hurt: cue({
    pulse1: [tone(0, "G3", 0.16, 6, "C3")],
    triangle: [tone(0, "E2", 0.1, 5)],
    noise: [{ beat: 0, len: 0.12, noise: 12, mode: "long", vol: 6 }],
  }),
  bossIntro: cue({
    triangle: [
      tone(0, "E2", 0.12, 7),
      tone(0.24, "G2", 0.12, 7),
      tone(0.48, "B2", 0.12, 8),
      tone(0.78, "E3", 0.2, 8),
    ],
    pulse1: [tone(0.78, "E4", 0.16, 6)],
    noise: [
      { beat: 0, len: 0.07, noise: 12, slideNoise: 15, mode: "long", vol: 7 },
      { beat: 0.24, len: 0.07, noise: 12, slideNoise: 15, mode: "long", vol: 7 },
      { beat: 0.48, len: 0.07, noise: 12, slideNoise: 15, mode: "long", vol: 7 },
      { beat: 0.78, len: 0.09, noise: 10, slideNoise: 15, mode: "long", vol: 8 },
    ],
  }),
  bomb: cue({
    triangle: [tone(0, "A2", 0.28, 7, "E1")],
    noise: [{ beat: 0, len: 0.26, noise: 14, slideNoise: 15, mode: "long", vol: 7 }],
  }),
  extraLife: cue({
    pulse1: [
      tone(0, "C5", 0.07, 6),
      tone(0.08, "E5", 0.07, 6),
      tone(0.16, "G5", 0.07, 6),
      tone(0.24, "C6", 0.07, 7),
      tone(0.32, "E6", 0.1, 7),
    ],
  }),
  extraBomb: cue({
    pulse1: [tone(0, "F4", 0.05, 6), tone(0.06, "A4", 0.05, 6), tone(0.12, "C5", 0.08, 6)],
  }),
  gameOver: cue({
    pulse1: [tone(0, "E4", 0.12, 6), tone(0.14, "C4", 0.12, 5), tone(0.28, "A3", 0.12, 5), tone(0.42, "F3", 0.16, 5)],
    triangle: [tone(0.02, "E3", 0.12, 5), tone(0.16, "C3", 0.12, 5), tone(0.3, "A2", 0.14, 5)],
  }),
  start: cue({
    pulse1: [tone(0, "D5", 0.06, 6), tone(0.07, "F#5", 0.06, 6), tone(0.14, "A5", 0.08, 7)],
  }),
  splash: cue({
    pulse1: [tone(0.02, "D5", 0.05, 5), tone(0.08, "A5", 0.05, 6), tone(0.14, "D6", 0.08, 6)],
    noise: [{ beat: 0, len: 0.12, noise: 9, slideNoise: 2, mode: "short", vol: 5 }],
  }),
};

export const SFX_REEL_CUES = [
  "shoot",
  "hit",
  "enemyDeath",
  "pickup",
  "levelUp",
  "menuMove",
  "menuSelect",
  "hurt",
  "bossIntro",
];

export function sfxReelPlan() {
  const events = [];
  let t = 0.35;
  for (let pass = 0; pass < 2; pass++) {
    for (const name of SFX_REEL_CUES) {
      events.push({ name, t });
      t += Math.max(2.2, SFX[name].seconds + 1.55);
    }
    t += 0.45;
  }
  return { seconds: Math.round((t + 0.4) * 1000) / 1000, events };
}

export function fernBattleId(theme) {
  if (theme && theme.id === "boss-pulse") return "boss";
  return "courtyard";
}

export function trackSeconds(track) {
  return (track.bars * 4 * 60) / track.bpm;
}
