export interface FontToken {
  family: string;
  type: "serif" | "sans" | "mono";
  source?: string;
}

export interface ThemeTokens {
  dimension: number;
  radius: number;
  spacing: number;
  typography: { base: number; ratio: number /*; weight: number*/ };
  scheme: "light" | "dark";
  fonts: {
    display: FontToken;
    displayAlt: FontToken;
    body: FontToken;
    mono: FontToken;
  };
  colors: {
    neutral: string;
    brand: string;
    primary: string;
    secondary: string;
    success: string;
    destructive: string;
  };
}
