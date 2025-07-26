import { Button } from "@/components/ui";
import { useTheme } from "@/context";
import { ThemeConfigurationCard } from "./ThemeConfigurationCard";

export function App() {
  const { theme, availableThemes, setTheme, isDark, toggleDark, setDark } =
    useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <ThemeConfigurationCard />
      <Button>Click me</Button>
    </div>
  );
}
