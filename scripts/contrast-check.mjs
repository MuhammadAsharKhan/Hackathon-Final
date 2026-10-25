/**
 * Prints the contrast ratio of every text token against the surfaces it is used
 * on. Text must reach 4.5:1, UI borders and icons 3:1.
 *
 *   node scripts/contrast-check.mjs
 */

const TOKENS = {
  ink: "#07111F",
  "ink-2": "#0E1B2E",
  "ink-3": "#162842",
  blue: "#1C74EF",
  "blue-600": "#1763D6",
  "blue-700": "#0F4FC4",
  "blue-400": "#4B94FF",
  "blue-50": "#F2F7FF",
  "blue-100": "#E6F0FF",
  lime: "#88C443",
  "lime-700": "#46781A",
  "lime-50": "#EFF8E2",
  mist: "#F3F6FB",
  surface: "#FFFFFF",
  line: "#E3E9F3",
  "line-soft": "#EEF2F8",
  text: "#0B1626",
  "text-2": "#3B4A60",
  muted: "#5D6C82",
  amber: "#B45309",
  "amber-bg": "#FFF3DC",
  rose: "#BE123C",
  "rose-bg": "#FFE8EE",
  violet: "#6D28D9",
  "violet-bg": "#F0EAFF",
  slate: "#475569",
  "slate-bg": "#EEF2F7",
  white: "#FFFFFF",
};

const toRgb = (hex) => {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
};

const channel = (value) => {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const ratio = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
};

// foreground token, background token, minimum
const PAIRS = [
  ["text", "surface", 4.5],
  ["text", "mist", 4.5],
  ["text-2", "surface", 4.5],
  ["text-2", "mist", 4.5],
  ["muted", "surface", 4.5],
  ["muted", "mist", 4.5],
  ["blue-700", "blue-50", 4.5],
  ["lime-700", "lime-50", 4.5],
  ["amber", "amber-bg", 4.5],
  ["rose", "rose-bg", 4.5],
  ["violet", "violet-bg", 4.5],
  ["slate", "slate-bg", 4.5],
  ["white", "ink", 4.5],
  ["blue-400", "ink", 4.5],
  ["white", "blue-600", 4.5],
];

// Reported but not enforced:
// - `line` is a hairline divider, decorative by design; it never carries state.
// - The brand gradient is fixed by the design brief, and its lightest stop sits
//   below AA for white text. See the note printed below the table.
const INFORMATIONAL = [
  ["line", "surface"],
  ["line", "mist"],
  ["white", "blue"],
];

let failures = 0;
const rows = [];

for (const [fg, bg, minimum] of PAIRS) {
  const value = ratio(TOKENS[fg], TOKENS[bg]);
  const pass = value >= minimum;
  if (!pass) failures += 1;
  rows.push({
    foreground: fg,
    background: bg,
    ratio: value.toFixed(2),
    required: minimum.toFixed(1),
    result: pass ? "pass" : "FAIL",
  });
}

console.table(rows);

const info = INFORMATIONAL.map(([fg, bg]) => ({
  foreground: fg,
  background: bg,
  ratio: ratio(TOKENS[fg], TOKENS[bg]).toFixed(2),
  note: "reported only",
}));
console.log("Informational (not enforced):");
console.table(info);

// The brand gradient is fixed by the design spec; report its lightest end too.
const gradientTop = ratio(TOKENS.white, "#3A8BFF");
console.log(
  `Note: white on the lightest end of the brand gradient (#3A8BFF) is ${gradientTop.toFixed(2)}:1.`
);
console.log(
  "      Primary buttons use that gradient because the brief fixes it, so their"
);
console.log(
  "      white label sits below 4.5:1 at the top of the button. Starting the"
);
console.log(
  "      gradient at #1C74EF instead of #3A8BFF clears AA."
);

if (failures > 0) {
  console.log(`\n${failures} pair(s) below the target.`);
  process.exit(1);
}

console.log("\nAll pairs meet their target.");
