import { useTheme } from "@/app/themeEditor/context";
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";

// const dimensions = {
//   sm: 6,
//   md: 8,
//   lg: 12,
//   xl: 16,
// } satisfies Record<string, number>;

const spacing = {
  tight: 0.2,
  normal: 0.25,
  relaxed: 0.375,
  loose: 0.5,
} satisfies Record<string, number>;

const radius = {
  none: 0,
  sm: 0.25,
  md: 0.5,
  lg: 0.75,
  xl: 1,
  full: 2,
} satisfies Record<string, number>;

const colors = [
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
];

const NumberSelect = ({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: number;
  options: Record<string, number>;
  onChange: (value: number) => void;
}) => (
  <div className="space-y-2">
    <Label>{title}</Label>
    <Select
      value={String(value)}
      onValueChange={(value: string) => onChange(Number(value))}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select spacing" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(options).map(([label, value]) => (
          <SelectItem key={label} value={String(value)}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export function ThemeTokensForm() {
  const { tokens, setTokens } = useTheme();
  return (
    <div className="px-2 space-y-4">
      {/* <NumberSelect
        title="Dimension"
        value={tokens.dimension}
        options={dimensions}
        onChange={(dimension) => setTokens({ dimension })}
      /> */}

      <NumberSelect
        title="Spacing"
        value={tokens.spacing}
        options={spacing}
        onChange={(spacing) => setTokens({ spacing })}
      />

      <NumberSelect
        title="Roundedness"
        value={tokens.radius}
        options={radius}
        onChange={(radius) => setTokens({ radius })}
      />
    </div>
  );
}
