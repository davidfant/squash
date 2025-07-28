import { useTheme } from "@/app/themeEditor/context";
import type { FontToken } from "@/app/themeEditor/types";
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
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
    type: "sans",
  },
  {
    label: "System Serif",
    family: `ui-serif, Georgia, Cambria, "Times New Roman", Times, serif`,
    type: "serif",
  },
  {
    label: "System Mono",
    family: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`,
    type: "mono",
  },
  {
    family: "Inter",
    type: "sans",
    source:
      "https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&display=swap",
  },
  {
    family: "Roboto",
    type: "sans",
    source:
      "https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap",
  },
  {
    family: "Open Sans",
    type: "sans",
    source:
      "https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap",
  },
  {
    family: "Lato",
    type: "sans",
    source:
      "https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap",
  },
  {
    family: "Poppins",
    type: "sans",
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
    type: "mono",
    source:
      "https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap",
  },
  {
    family: "Fira Code",
    type: "mono",
    source:
      "https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&display=swap",
  },
  {
    family: "Monaco",
    type: "mono",
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

  return (
    <div className="px-2 space-y-6">
      <FontSelect
        title="Display Font"
        value={tokens.fonts.display}
        onChange={(display) =>
          setTokens({ fonts: { ...tokens.fonts, display } })
        }
      />
      <FontSelect
        title="Display Font (alt)"
        value={tokens.fonts.displayAlt}
        onChange={(displayAlt) =>
          setTokens({ fonts: { ...tokens.fonts, displayAlt } })
        }
      />
      <FontSelect
        title="Body Font"
        value={tokens.fonts.body}
        onChange={(body) =>
          setTokens({
            fonts: {
              ...tokens.fonts,
              body,
            },
          })
        }
      />
      <FontSelect
        title="Mono Font"
        value={tokens.fonts.mono}
        onChange={(mono) => setTokens({ fonts: { ...tokens.fonts, mono } })}
      />
    </div>
  );
}
