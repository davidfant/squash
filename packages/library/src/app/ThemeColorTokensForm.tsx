import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { useTheme } from "@/context";

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

const ColorSelectContent = ({
  label,
  color,
}: {
  label: string;
  color: string;
}) => (
  <div className="flex items-center gap-2">
    <div
      className="w-4 h-4 rounded-full"
      style={{ backgroundColor: `var(--${color}-6)` }}
    />
    <span className="capitalize">{label}</span>
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
  options: Array<{ label: string; value: V; color: string }>;
  onChange: (value: V) => void;
}) => {
  const option = options.find((o) => o.value === value);
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue>
            <ColorSelectContent
              label={option?.label ?? value ?? "Not set"}
              color={option?.color ?? value ?? "gray"}
            />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              <ColorSelectContent label={o.label} color={o.color} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

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
        title="Primary"
        value={tokens.colors.primary}
        options={accentColors.map((c) => ({ label: c, value: c, color: c }))}
        onChange={(primary) =>
          setTokens({
            colors: {
              ...tokens.colors,
              primary,
              background: Object.keys(accentsByBg).find(
                (bg) =>
                  !!accentsByBg[bg as BackgroundColor]?.includes(
                    primary as AccentColor
                  )
              )!,
            },
          })
        }
      />
      <ColorSelect
        title="Background"
        value={tokens.colors.background ?? defaultBackground ?? null}
        options={backgroundColors.map((c) => ({
          label: c,
          value: c,
          color: c,
        }))}
        onChange={(background) =>
          setTokens({ colors: { ...tokens.colors, background } })
        }
      />
    </div>
  );
}
