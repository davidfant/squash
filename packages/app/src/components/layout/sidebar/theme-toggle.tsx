import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-7 w-7"
    >
      {theme === "light" ? (
        <Moon className="h-3.5 w-3.5 transition-all" />
      ) : (
        <Sun className="h-3.5 w-3.5 transition-all" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
} 