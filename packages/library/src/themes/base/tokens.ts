import type { ThemeTokens } from "./types";

export const tokens: ThemeTokens = {
  dimension: 8,
  spacing: 0.5,
  radius: 0.5,
  colors: { primary: "blue", background: "slate" },
  fonts: {
    body: {
      family:
        "ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
      type: "sans-serif",
      weight: 400,
    },
    heading: {
      family:
        "ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
      type: "sans-serif",
      weight: 400,
    },
  },
};
