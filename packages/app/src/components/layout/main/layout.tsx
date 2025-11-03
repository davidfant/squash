import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { type ReactNode } from "react";
import { MainHeader } from "./header";
import { AppSidebar } from "./sidebar/app-sidebar";
import { SiteHeader } from "./sidebar/site-header";
import { WaitlistProvider } from "./waitlist-context";

export function MainLayout({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  const isSignedIn = useAuth().isSignedIn;
  if (isSignedIn === undefined) return null;
  return (
    <WaitlistProvider>
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
    </WaitlistProvider>
  );
}
