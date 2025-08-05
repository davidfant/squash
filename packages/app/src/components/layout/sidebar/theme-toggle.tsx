import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem("theme");
    
    if (savedTheme) {
      setTheme(savedTheme as "light" | "dark");
      applyTheme(savedTheme as "light" | "dark");
    } else {
      // Check system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const systemTheme = prefersDark ? "dark" : "light";
      setTheme(systemTheme);
      applyTheme(systemTheme);
    }
  }, []);

  const applyTheme = (newTheme: "light" | "dark") => {
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

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