import { UserButton } from "@clerk/clerk-react";

import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

export function NavUser() {
  const { theme, toggleTheme } = useTheme();

  const themeLabel = `Switch to ${theme === "dark" ? "light" : "dark"} theme`;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* <SignedIn> */}
        <UserButton>
          <UserButton.MenuItems>
            <UserButton.Action
              label={themeLabel}
              labelIcon={theme === "dark" ? <Sun /> : <Moon />}
              onClick={toggleTheme}
            />
          </UserButton.MenuItems>
        </UserButton>
        {/* </SignedIn>
        <SignedOut>
          <div className="flex flex-col gap-2">
            <SignInButton
              mode={isMobile ? "modal" : "redirect"}
            >
              <Button variant="secondary" size="lg">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton
              mode={isMobile ? "modal" : "redirect"}
            >
              <Button variant="outline" size="lg">
                Sign up
              </Button>
            </SignUpButton>
          </div>
        </SignedOut> */}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
