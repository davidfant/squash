import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { useTheme } from "@/context";
import { ButtonPreviews } from "./previews/button";
import { ThemeColorTokensForm } from "./ThemeColorTokensForm";
import { ThemeFontTokensForm } from "./ThemeFontTokensForm";
import { ThemeTokensForm } from "./ThemeTokensForm";

// Define the preview list
const previews = [
  {
    key: "buttons",
    label: "Buttons",
    component: ButtonPreviews,
  },
];

export function App() {
  const { theme, availableThemes, setTheme, isDark, setDark } = useTheme();
  const handlePreviewClick = (key: string) => (window.location.hash = key);
  const currentPreviewKey = window.location.hash.slice(1);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>Theme Configuration</SidebarHeader>
          <SidebarContent className="gap-0">
            {/* Dark Mode Tabs */}
            <SidebarGroup>
              <SidebarGroupLabel>Mode</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-2">
                  <Tabs
                    value={isDark ? "dark" : "light"}
                    onValueChange={(value: string) => setDark(value === "dark")}
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="light">Light</TabsTrigger>
                      <TabsTrigger value="dark">Dark</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Theme Selection */}
            <SidebarGroup>
              <SidebarGroupLabel>Theme</SidebarGroupLabel>
              <SidebarGroupContent className="px-2">
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{theme}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableThemes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Tokens</SidebarGroupLabel>
              <SidebarGroupContent>
                <ThemeTokensForm />
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Colors</SidebarGroupLabel>
              <SidebarGroupContent>
                <ThemeColorTokensForm />
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Typography</SidebarGroupLabel>
              <SidebarGroupContent>
                <ThemeFontTokensForm />
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Components Preview Navigation */}
            <SidebarGroup>
              <SidebarGroupLabel>Components</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {previews.map((preview) => (
                    <SidebarMenuItem key={preview.key}>
                      <SidebarMenuButton
                        isActive={currentPreviewKey === preview.key}
                        onClick={() => handlePreviewClick(preview.key)}
                      >
                        <span>{preview.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="p-4">
          <div className="space-y-8">
            {previews.map((preview) => {
              const Component = preview.component;
              return (
                <div key={preview.key} id={preview.key} className="space-y-4">
                  <h2 className="text-2xl font-bold">{preview.label}</h2>
                  <Component />
                </div>
              );
            })}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
