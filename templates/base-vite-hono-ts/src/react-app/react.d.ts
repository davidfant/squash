import "react";

declare module "react" {
  // allow any CSS custom property: --foo, --bar, …
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}
