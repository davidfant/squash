import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { useTheme } from "@/context";
import type { FontToken } from "@/themes/base/types";
import { useEffect } from "react";

const fonts: Array<{
  label?: string;
  family: string;
  type: FontToken["type"];
  source?: string;
}> = [
  {
    label: "System",
    family: `ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`,
    type: "sans-serif",
  },
  {
    family: "Inter",
    type: "sans-serif",
    source:
      "https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&display=swap",
  },
  {
    family: "Roboto",
    type: "sans-serif",
    source:
      "https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap",
  },
  {
    family: "Open Sans",
    type: "sans-serif",
    source:
      "https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap",
  },
  {
    family: "Lato",
    type: "sans-serif",
    source:
      "https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap",
  },
  {
    family: "Poppins",
    type: "sans-serif",
    source:
      "https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap",
  },
  {
    family: "Playfair Display",
    type: "serif",
    source:
      "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap",
  },
  {
    family: "Merriweather",
    type: "serif",
    source:
      "https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&display=swap",
  },
  {
    family: "Georgia",
    type: "serif",
  },
  {
    family: "Times New Roman",
    type: "serif",
  },
  {
    family: "JetBrains Mono",
    type: "monospace",
    source:
      "https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap",
  },
  {
    family: "Fira Code",
    type: "monospace",
    source:
      "https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&display=swap",
  },
  {
    family: "Monaco",
    type: "monospace",
  },
];

// Standard font weights available for all fonts
const availableWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const weightLabels: Record<number, string> = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black",
};

const FontSelect = ({
  title,
  value,
  onChange,
}: {
  title: string;
  value: FontToken;
  onChange: (font: FontToken) => void;
}) => {
  const selected = fonts.find((f) => f.family === value.family);
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{title}</Label>

      <Select
        value={value.family}
        onValueChange={(family: string) => {
          const selectedFont = fonts.find((f) => f.family === family);
          if (selectedFont) {
            onChange({
              family,
              type: selectedFont.type,
              weight: value.weight,
              source: selectedFont.source,
            });
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            <span style={{ fontFamily: value.family }}>
              {selected?.label ?? value.family}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {fonts.map((font) => (
            <SelectItem
              key={font.family}
              value={font.family}
              style={{ fontFamily: font.family }}
            >
              {font.label ?? font.family}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.weight.toString()}
        onValueChange={(weight: string) =>
          onChange({ ...value, weight: parseInt(weight) })
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            <span
              style={{ fontFamily: value.family, fontWeight: value.weight }}
            >
              {weightLabels[value.weight]}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableWeights.map((weight) => (
            <SelectItem
              key={weight}
              value={weight.toString()}
              style={{ fontFamily: value.family, fontWeight: weight }}
            >
              {weightLabels[weight]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export function ThemeFontTokensForm() {
  const { tokens, setTokens } = useTheme();

  // Load all Google Fonts for proper preview
  useEffect(() => {
    const googleFonts = fonts.filter((font) => font.source);

    // Create or update the font loading style element
    let fontStyleElement = document.getElementById(
      "theme-font-imports"
    ) as HTMLStyleElement;
    if (!fontStyleElement) {
      fontStyleElement = document.createElement("style");
      fontStyleElement.id = "theme-font-imports";
      document.head.appendChild(fontStyleElement);
    }

    // Generate @import statements for all Google Fonts
    const importStatements = googleFonts
      .map((font) => `@import url('${font.source}');`)
      .join("\n");

    fontStyleElement.textContent = importStatements;

    return () => {
      // Clean up on unmount
      const styleElement = document.getElementById("theme-font-imports");
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

  // Create default FontToken objects if they don't exist or are strings
  const getDefaultFontToken = (
    fontValue: any,
    defaultFamily: string,
    defaultWeight: number
  ): FontToken => {
    if (typeof fontValue === "object" && fontValue.family) {
      return fontValue;
    }

    // If it's a string or doesn't have the right structure, create a default
    return {
      family: defaultFamily,
      type: "sans-serif",
      weight: defaultWeight,
    };
  };

  const bodyFont = getDefaultFontToken(tokens.fonts?.body, "System", 400);
  const headingFont = getDefaultFontToken(tokens.fonts?.heading, "System", 600);

  return (
    <div className="px-2 space-y-6">
      <FontSelect
        title="Heading Font"
        value={headingFont}
        onChange={(heading) =>
          setTokens({
            fonts: {
              ...tokens.fonts,
              heading,
            },
          })
        }
      />

      <FontSelect
        title="Body Font"
        value={bodyFont}
        onChange={(body) =>
          setTokens({
            fonts: {
              ...tokens.fonts,
              body,
            },
          })
        }
      />
    </div>
  );
}
