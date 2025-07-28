import { useTheme } from "@/app/themeEditor/context";
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";

const accentColors = [
  // "gray",
  // "mauve",
  // "slate",
  // "sage",
  // "olive",
  // "sand",
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
] as const;

const backgroundColors = ["gray", "mauve", "slate", "sage", "olive", "sand"];

type AccentColor = (typeof accentColors)[number];
type BackgroundColor = (typeof backgroundColors)[number];

const accentsByBg: Record<BackgroundColor, AccentColor[]> = {
  mauve: [
    "tomato",
    "red",
    "ruby",
    "crimson",
    "pink",
    "plum",
    "purple",
    "violet",
  ],
  slate: ["iris", "indigo", "blue", "sky", "cyan"],
  sage: ["mint", "teal", "jade", "green"],
  olive: ["grass", "lime"],
  sand: ["yellow", "amber", "orange", "brown"],
};

const ColorSelectContent = ({ color }: { color: string }) => (
  <div className="flex items-center gap-2">
    <div
      className="w-4 h-4 rounded-full"
      style={{ backgroundColor: `var(--${color}-9)` }}
    />
    <span className="capitalize">{color}</span>
  </div>
);

const ColorSelect = <V extends string>({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: V;
  options: readonly string[];
  onChange: (value: V) => void;
}) => (
  <div className="space-y-2">
    <Label>{title}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue>
          <ColorSelectContent color={value ?? "gray"} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            <ColorSelectContent color={o} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export function ThemeColorTokensForm() {
  const { tokens, setTokens } = useTheme();
  const defaultBackground = Object.keys(accentsByBg).find(
    (bg) =>
      !!accentsByBg[bg as BackgroundColor]?.includes(
        tokens.colors.primary as AccentColor
      )
  );
  return (
    <div className="px-2 space-y-4">
      <ColorSelect
        title="Brand"
        value={tokens.colors.brand}
        options={accentColors}
        onChange={(brand) =>
          setTokens({
            colors: {
              ...tokens.colors,
              brand,
              neutral: Object.keys(accentsByBg).find(
                (bg) =>
                  !!accentsByBg[bg as BackgroundColor]?.includes(
                    brand as AccentColor
                  )
              )!,
            },
          })
        }
      />
      <ColorSelect
        title="Primary"
        value={tokens.colors.primary}
        options={accentColors}
        onChange={(primary) =>
          setTokens({ colors: { ...tokens.colors, primary } })
        }
      />
      <ColorSelect
        title="Secondary"
        value={tokens.colors.secondary}
        options={accentColors}
        onChange={(secondary) =>
          setTokens({ colors: { ...tokens.colors, secondary } })
        }
      />
      <ColorSelect
        title="Background"
        value={tokens.colors.neutral ?? defaultBackground ?? null}
        options={backgroundColors}
        onChange={(neutral) =>
          setTokens({ colors: { ...tokens.colors, neutral } })
        }
      />
    </div>
  );
}
