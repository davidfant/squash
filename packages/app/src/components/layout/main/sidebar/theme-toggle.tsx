import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const Icon = theme === "light" ? Sun : Moon;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-7 w-7"
    >
      <Icon className="h-3.5 w-3.5 transition-all" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
