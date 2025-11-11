import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ClerkLoaded, SignedIn, SignedOut } from "@clerk/clerk-react";
import { type ReactNode } from "react";
import { MainHeader } from "./header";
import { AppSidebar } from "./sidebar/app-sidebar";
import { SiteHeader } from "./sidebar/site-header";

export const MainLayout = ({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) => (
  <ClerkLoaded>
    <SignedIn>
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader title={title} />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </SignedIn>
    <SignedOut>
      <MainHeader />
      {children}
    </SignedOut>
  </ClerkLoaded>
);
