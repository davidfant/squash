export interface FontToken {
  family: string;
  type: "serif" | "sans-serif" | "monospace";
  weight: number;
  source?: string;
}

export interface ThemeColorTokens {
  primary: string;
  background: string;
}

export interface ThemeFontTokens {
  body: FontToken;
  heading: FontToken;
  // mono: FontToken;
}

export interface ThemeTokens {
  colors: ThemeColorTokens;
  fonts: ThemeFontTokens;
  dimension: number;
  spacing: number;
  radius: number;
}
