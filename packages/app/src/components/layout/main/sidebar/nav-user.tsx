import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";

import { SidebarMenu, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

export function NavUser() {
  const { isMobile } = useSidebar();
  const { theme, toggleTheme } = useTheme();

  const themeLabel = `Switch to ${theme === "dark" ? "light" : "dark"} theme`;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SignedIn>
          <UserButton afterSignOutUrl="/">
            <UserButton.MenuItems>
              <UserButton.Action label={themeLabel} onClick={toggleTheme} />
            </UserButton.MenuItems>
          </UserButton>
        </SignedIn>
        <SignedOut>
          <div className="flex flex-col gap-2">
            <SignInButton mode={isMobile ? "modal" : "redirect"} afterSignInUrl="/">
              <Button variant="secondary" size="lg">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton
              mode={isMobile ? "modal" : "redirect"}
              afterSignUpUrl="/"
            >
              <Button variant="outline" size="lg">
                Sign up
              </Button>
            </SignUpButton>
          </div>
        </SignedOut>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
