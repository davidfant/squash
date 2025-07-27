// src/ComponentsContext.tsx
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as BaseComponents from "./themes/base/ui";

type Components = typeof BaseComponents;

// ---- Discover all themes under ./themes/<name>/ui/index.ts ----
// Each theme's index should export the same shape as BaseComponents.
const themeModules = import.meta.glob("./themes/*/ui/index.ts", {
  eager: true,
  import: "*", // import the full module object (all named exports)
}) as Record<string, unknown>;

const themesMap: Record<string, Components> = Object.fromEntries(
  Object.entries(themeModules).map(([path, mod]) => {
    // Extract the <name> from "./themes/<name>/ui/index.ts"
    const match = path.match(/\.\/themes\/([^/]+)\/ui\/index\.ts$/);
    const name = match?.[1] ?? "base";
    return [name, { ...BaseComponents, ...(mod as Partial<Components>) }];
  })
);

const availableThemes = Object.keys(themesMap).sort();
const defaultTheme = "base";

// ---- Context shape ----
type ComponentsContextValue = {
  components: Components;
  theme: string;
  availableThemes: string[];
  setTheme: (name: string) => void;

  isDark: boolean;
  toggleDark: () => void;
  setDark: (dark: boolean) => void;
};

const ComponentsContext = createContext<ComponentsContextValue>({
  components: BaseComponents,
  theme: defaultTheme,
  availableThemes,
  setTheme: () => {},
  isDark: false,
  toggleDark: () => {},
  setDark: () => {},
});

// ---- Provider ----
export function ComponentsProvider({
  children,
  initialTheme = defaultTheme,
  initialDark = true,
  wrapperClassName,
}: {
  children: ReactNode;
  /** Optional initial theme name; defaults to "base" */
  initialTheme?: string;
  /** Optional initial dark mode; defaults to false */
  initialDark?: boolean;
  /** Optional extra classes for the wrapping container */
  wrapperClassName?: string;
}) {
  const [theme, setThemeState] = useState<string>(
    themesMap[initialTheme] ? initialTheme : defaultTheme
  );
  const [isDark, setDark] = useState<boolean>(initialDark);

  const setTheme = (name: string) => {
    if (themesMap[name]) setThemeState(name);
    else {
      // eslint-disable-next-line no-console
      console.warn(`[ComponentsProvider] Unknown theme "${name}".`);
      setThemeState(defaultTheme);
    }
  };

  const value = useMemo<ComponentsContextValue>(() => {
    return {
      components: themesMap[theme] ?? BaseComponents,
      theme,
      availableThemes,
      setTheme,
      isDark,
      toggleDark: () => setDark((d) => !d),
      setDark,
    };
  }, [theme, isDark]);

  // Wrap children. When dark mode is on, the wrapper gets the "dark" class.
  // If you use Tailwind, set `darkMode: "class"` in tailwind.config.js.
  return (
    <ComponentsContext.Provider value={value}>
      <div
        className={[isDark ? "dark" : "", wrapperClassName]
          .filter(Boolean)
          .join(" ")}
        data-theme={theme}
      >
        {children}
      </div>
    </ComponentsContext.Provider>
  );
}

export const useComponent = <T extends keyof Components>(name: T) => {
  const { components } = useContext(ComponentsContext);
  return components[name];
};

export const themedComponent =
  <T extends keyof Components>(name: T): Components[T] =>
  (props: any) => {
    const Component = useComponent(name);
    return <Component {...props} />;
  };

export const useTheme = () => {
  const { theme, availableThemes, setTheme, isDark, toggleDark, setDark } =
    useContext(ComponentsContext);
  return { theme, availableThemes, setTheme, isDark, toggleDark, setDark };
};
