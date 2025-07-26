import {
  Card,
  CardContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { useTheme } from "@/context";

export function ThemeConfigurationCard() {
  const { theme, availableThemes, setTheme, isDark, toggleDark, setDark } =
    useTheme();

  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-8">
          {/* Theme Selection */}
          <div className="flex-1">
            <Label className="text-sm font-medium mb-2 block">Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select theme..." />
              </SelectTrigger>
              <SelectContent>
                {availableThemes.map((themeName) => (
                  <SelectItem key={themeName} value={themeName}>
                    {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dark Mode Tabs */}
          <div className="flex-1">
            <Label className="text-sm font-medium mb-2 block">Mode</Label>
            <Tabs
              value={isDark ? "dark" : "light"}
              onValueChange={(value) => setDark(value === "dark")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="light">Light</TabsTrigger>
                <TabsTrigger value="dark">Dark</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
