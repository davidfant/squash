import defaultTokens from "@/themes/base/tokens";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as defaultComponents from "../../themes/base/ui";
import { generateScaleProcedural } from "./generateScaleProcedural";
import type { FontToken, ThemeTokens } from "./types";

const radixColorNames = [
  "gray",
  "mauve",
  "slate",
  "sage",
  "olive",
  "sand",
  "tomato",
  "red",
  "ruby",
  "crimson",
  "pink",
  "plum",
  "purple",
  "violet",
  "iris",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "jade",
  "green",
  "grass",
  "bronze",
  "gold",
  "brown",
  "orange",
  "amber",
  "yellow",
  "lime",
  "mint",
  "sky",
  "black",
];

type Components = typeof defaultComponents;
type ComponentModule = Partial<Components>;
type TokensExport = Partial<ThemeTokens>;

const componentModules = import.meta.glob("./themes/*/ui/index.ts", {
  eager: true,
  import: "*",
}) as Record<string, ComponentModule>;

const tokenModules = import.meta.glob("./themes/*/tokens.ts", {
  eager: true,
  import: "*",
}) as Record<string, TokensExport>;

// Map path -> theme name for components and tokens
const componentsByName: Record<string, ComponentModule> = Object.fromEntries(
  Object.entries(componentModules).map(([path, mod]) => {
    // "./themes/<name>/ui/index.ts"
    const match = path.match(/\.\/themes\/([^/]+)\/ui\/index\.ts$/);
    const name = match?.[1] ?? "base";
    return [name, mod ?? {}];
  })
);

const tokensByName: Record<string, Partial<ThemeTokens>> = Object.fromEntries(
  Object.entries(tokenModules).map(([path, mod]) => {
    // "./themes/<name>/tokens.ts"
    const match = path.match(/\.\/themes\/([^/]+)\/tokens\.ts$/);
    const name = match?.[1] ?? "base";
    return [name, mod];
  })
);

// Union of all theme names we discovered (ensure "base" is present)
const allThemeNames = Array.from(
  new Set([
    "base",
    ...Object.keys(componentsByName),
    ...Object.keys(tokensByName),
  ])
);

const themesMap: Record<
  string,
  { components: Components; tokens: ThemeTokens }
> = Object.fromEntries(
  allThemeNames.map((name) => [
    name,
    {
      components: { ...defaultComponents, ...componentsByName[name] },
      tokens: { ...(defaultTokens as ThemeTokens), ...tokensByName[name] },
    },
  ])
);

const availableThemes = Object.keys(themesMap).sort();
const defaultTheme = "base";

interface ThemeContextValue {
  theme: string;
  components: Components;
  tokens: ThemeTokens;
  availableThemes: string[];

  setTheme(name: string): void;
  setTokens(tokens: Partial<ThemeTokens>): void;
}

const ThemeContext = createContext<ThemeContextValue>({
  components: defaultComponents,
  tokens: defaultTokens as ThemeTokens,
  theme: defaultTheme,
  availableThemes,
  setTheme: () => {},
  setTokens: () => {},
});

const fontFallbackByType: Record<FontToken["type"], string> = {
  serif: `ui-serif, Georgia, Cambria, "Times New Roman", Times, serif`,
  sans: `ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`,
  mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`,
};

export function ThemeProvider({
  children,
  initialTheme = defaultTheme,
}: {
  children: ReactNode;
  initialTheme?: string;
}) {
  const [theme, setTheme] = useState<string>(
    themesMap[initialTheme] ? initialTheme : defaultTheme
  );
  const [tokens, setTokens] = useState<ThemeTokens>(
    defaultTokens as ThemeTokens
  );
  const [components, setComponents] = useState<Components>(defaultComponents);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tokens.scheme === "dark");
  }, [tokens.scheme]);

  console.log(
    "XX",
    Object.fromEntries(
      Object.entries(tokens.colors).flatMap(([name, value]) => {
        if (radixColorNames.includes(value)) {
          return Array.from({ length: 12 }, (_, i) => [
            `theme-color-${name}-${i + 1}`,
            `var(--${value}-${i + 1})`,
          ]);
        } else {
          const hexes = generateScaleProcedural({
            hex: value,
            scheme: tokens.scheme,
          });
          return hexes.map((hex, i) => [`theme-color-${name}-${i + 1}`, hex]);
        }
      })
    )
  );
  return (
    <ThemeContext.Provider
      value={{
        components,
        tokens,
        theme,
        availableThemes,
        setTheme: (name: string) => {
          setTheme(name);
          setTokens(themesMap[name]!.tokens);
          setComponents(themesMap[name]!.components);
        },
        setTokens: (tokens: Partial<ThemeTokens>) =>
          setTokens((prev) => ({ ...prev, ...tokens })),
      }}
    >
      {/* <div
        style={
          {
            "--dimension": `${tokens.dimension}px`,
            "--radius": `${tokens.radius * tokens.dimension}px`,
            "--spacing": `${tokens.spacing * tokens.dimension}px`,

            // Generate color variants 1-12 for each color in tokens.colors
            ...Object.entries(tokens.colors).reduce(
              (acc, [colorName, colorValue]) => {
                for (let i = 1; i <= 12; i++) {
                  acc[`--${colorName}-${i}`] = `var(--${colorValue}-${i})`;
                }
                return acc;
              },
              {} as Record<string, string>
            ),
          } as React.CSSProperties
        }
      > */}
      <style>{`
          :root {
            ${Object.entries({
              "theme-dimension": `${tokens.dimension}px`,
              "theme-radius": tokens.radius,
              "theme-spacing": tokens.spacing,
              "theme-typography-base": tokens.typography.base,
              "theme-typography-ratio": tokens.typography.ratio,
              // "theme-typography-weight": tokens.typography.weight,
              "theme-font-display": tokens.fonts.display.family,
              "theme-font-display-alt": tokens.fonts.displayAlt.family,
              "theme-font-body": tokens.fonts.body.family,
              "theme-font-mono": tokens.fonts.mono.family,
              // neutral, brand, primary, secondary, success, destructive
              ...Object.fromEntries(
                Object.entries(tokens.colors).flatMap(([name, value]) => {
                  if (radixColorNames.includes(value)) {
                    return Array.from({ length: 12 }, (_, i) => [
                      `theme-color-${name}-${i + 1}`,
                      `var(--${value}-${i + 1})`,
                    ]);
                  } else {
                    const hexes = generateScaleProcedural({
                      hex: value,
                      scheme: tokens.scheme,
                    });
                    return hexes.map((hex, i) => [
                      `theme-color-${name}-${i + 1}`,
                      hex,
                    ]);
                  }
                })
              ),
            })
              .map(([key, value]) => `--${key}: ${value};`)
              .join("\n")}
          }
        `}</style>
      {children}
      {/* </div> */}
    </ThemeContext.Provider>
  );
}

export const useComponent = <T extends keyof Components>(name: T) => {
  const { components } = useContext(ThemeContext);
  return components[name];
};

export const themedComponent = <T extends keyof Components>(
  name: T
): Components[T] =>
  ((props: any) => {
    const Component = useComponent(name) as React.ComponentType<any>;
    return <Component {...props} />;
  }) as any;

export const useTheme = () => useContext(ThemeContext);
