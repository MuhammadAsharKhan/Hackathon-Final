const readToken = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const hexToChannels = (hex) => {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((part) => part + part)
          .join("")
      : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
};

// Chart colours are mixed from the theme tokens so the palette follows the
// tokens instead of carrying its own hex values.
const mix = (first, second, ratio) => {
  const a = hexToChannels(first);
  const b = hexToChannels(second);
  const channels = a.map((channel, index) =>
    Math.round(channel * (1 - ratio) + b[index] * ratio)
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
};

let cached = null;

export const chartTheme = () => {
  if (cached) return cached;

  const background = readToken("--background") || "#ffffff";
  const foreground = readToken("--foreground") || "#0a0a0a";
  const primary = readToken("--primary") || "#0f766e";
  const success = readToken("--success") || "#16a34a";
  const muted = readToken("--muted-foreground") || "#71717a";
  const border = readToken("--border") || "#e4e4e7";

  cached = {
    background,
    foreground,
    primary,
    muted,
    border,
    axis: muted,
    grid: border,
    series: [
      primary,
      mix(primary, foreground, 0.4),
      success,
      mix(primary, background, 0.45),
      muted,
      mix(success, background, 0.35),
    ],
  };

  return cached;
};

export const tooltipStyles = () => {
  const theme = chartTheme();

  return {
    contentStyle: {
      background: "var(--background)",
      border: "1px solid var(--border)",
      borderRadius: "0.5rem",
      fontSize: "12px",
      color: "var(--foreground)",
      boxShadow: "none",
    },
    labelStyle: { color: theme.muted, fontSize: "12px" },
    itemStyle: { color: theme.foreground, fontSize: "12px" },
  };
};
