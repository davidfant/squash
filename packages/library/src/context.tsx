import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { tokens as defaultTokens } from "./themes/base/tokens";
import type { ThemeTokens } from "./themes/base/types";
import * as defaultComponents from "./themes/base/ui";

type Components = typeof defaultComponents;
type ComponentModule = Partial<Components>;
type TokensExport = { tokens?: Partial<ThemeTokens> };

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
    return [name, mod?.tokens ?? {}];
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
      tokens: { ...defaultTokens, ...tokensByName[name] },
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
  isDark: boolean;

  setTheme(name: string): void;
  setDark(dark: boolean): void;
  setTokens(tokens: Partial<ThemeTokens>): void;
}

const ThemeContext = createContext<ThemeContextValue>({
  components: defaultComponents,
  tokens: defaultTokens,
  theme: defaultTheme,
  availableThemes,
  setTheme: () => {},
  isDark: false,
  setDark: () => {},
  setTokens: () => {},
});

export function ThemeProvider({
  children,
  initialTheme = defaultTheme,
  initialDark = false,
}: {
  children: ReactNode;
  initialTheme?: string;
  initialDark?: boolean;
}) {
  const [theme, setTheme] = useState<string>(
    themesMap[initialTheme] ? initialTheme : defaultTheme
  );
  const [isDark, setDark] = useState<boolean>(initialDark);
  const [tokens, setTokens] = useState<ThemeTokens>(defaultTokens);
  const [components, setComponents] = useState<Components>(defaultComponents);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

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
        isDark,
        setDark,
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
              dimension: `${tokens.dimension}px`,
              radius: `${tokens.radius * tokens.dimension}px`,
              spacing: `${tokens.spacing * tokens.dimension}px`,
              ...Object.entries(tokens.colors).reduce(
                (acc, [colorName, colorValue]) => {
                  for (let i = 1; i <= 12; i++) {
                    acc[`${colorName}-${i}`] = `var(--${colorValue}-${i})`;
                  }
                  return acc;
                },
                {} as Record<string, string>
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

export const themedComponent =
  <T extends keyof Components>(name: T) =>
  (props: any) => {
    const Component = useComponent(name) as React.ComponentType<any>;
    return <Component {...props} />;
  };

export const useTheme = () => useContext(ThemeContext);
