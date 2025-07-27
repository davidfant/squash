import {
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

export function App() {
  const { theme, availableThemes, setTheme, isDark, setDark } = useTheme();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>Theme Configuration</SidebarHeader>
          <SidebarContent>
            {/* Dark Mode Tabs */}
            <SidebarGroup>
              <SidebarGroupLabel>Mode</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-2">
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
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Theme Selection */}
            <SidebarGroup>
              <SidebarGroupLabel>Theme</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {availableThemes.map((themeName) => (
                    <SidebarMenuItem key={themeName}>
                      <SidebarMenuButton
                        isActive={theme === themeName}
                        onClick={() => setTheme(themeName)}
                      >
                        <span>
                          {themeName.charAt(0).toUpperCase() +
                            themeName.slice(1)}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              <div className="aspect-video rounded-xl bg-muted/50" />
              <div className="aspect-video rounded-xl bg-muted/50" />
              <div className="aspect-video rounded-xl bg-muted/50" />
            </div>
            <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
