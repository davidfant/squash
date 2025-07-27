export interface ThemeColorTokens {
  primary: string;
  background: string;
}

export interface ThemeFontTokens {
  body: string;
  heading: string;
  mono: string;
}

export interface ThemeTokens {
  colors: ThemeColorTokens;
  fonts: ThemeFontTokens;
  dimension: number;
  spacing: number;
  radius: number;
}
