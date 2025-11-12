"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
} from "@/app/components/ui/sidebar";
import { Skeleton } from "../../components/ui/skeleton";

export function ReviewSidebar() {
  return (
    <Sidebar collapsible="none" className="border-r">
      <SidebarHeader className="gap-3.5 border-b p-4">
        <div className="flex w-full items-center justify-between">
          <div className="text-foreground text-base font-medium">Review</div>
        </div>
        <SidebarInput placeholder="Type to search..." />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            {Array.from({ length: 10 }).map((_, index) => (
              <a
                href="#"
                key={index}
                className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground space-y-2 border-b p-4 text-sm last:border-b-0 block"
              >
                <div className="flex w-full items-center gap-2 justify-between">
                  <div className="flex-1">
                    <Skeleton className="w-1/2 h-5 animate-none" />
                  </div>
                  <span className="ml-auto text-xs">
                    <Skeleton className="w-12 h-3 animate-none" />
                  </span>
                </div>
                <div className="font-medium">
                  <Skeleton className="w-2/3 h-5 animate-none" />
                </div>
                <div className="line-clamp-2 text-xs whitespace-break-spaces w-full">
                  <Skeleton className="w-full h-3 animate-none mb-2" />
                  <Skeleton className="w-2/3 h-3 animate-none mb-2" />
                  <Skeleton className="w-4/5 h-3 animate-none" />
                </div>
              </a>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
