import { authClient } from "@/auth/client";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
  const session = authClient.useSession();
  const isAuthenticated = !!session.data?.session;
  if (session.isPending) return null;
  return (
    <WaitlistProvider>
      {isAuthenticated ? (
        <SidebarProvider>
          <AppSidebar variant="inset" />
          <SidebarInset>
            <SiteHeader title={title} />
            {children}
          </SidebarInset>
        </SidebarProvider>
      ) : (
        <>
          <MainHeader />
          {children}
        </>
      )}
    </WaitlistProvider>
  );
}
