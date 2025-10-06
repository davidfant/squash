import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { api, useQuery } from "@/hooks/api";
import { Link } from "react-router";

export function RecentBranchesSidebarGroup() {
  const branches = useQuery(api.branches.$get, { params: {} });
  if (!branches.data) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>
          <Skeleton className="h-4 w-[80%]" />
        </SidebarGroupLabel>
        <SidebarMenu className="px-2 gap-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </SidebarMenu>
      </SidebarGroup>
    );
  }
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Recent Prototypes</SidebarGroupLabel>
      <SidebarMenu className="gap-0">
        {!!branches.data.length ? (
          <>
            {branches.data.slice(0, 5).map((b) => (
              <SidebarMenuItem key={b.id}>
                <SidebarMenuButton>
                  <Link to={`/branches/${b.id}`} className="truncate">
                    {b.title}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to={`/prototypes`}>See All</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </>
        ) : (
          <div className="px-2 text-sm text-muted-foreground italic">
            No prototypes yet
          </div>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
