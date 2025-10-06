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

export function ReposSidebarGroup() {
  const repos = useQuery(api.repos.$get, { params: {} });
  if (!repos.data) {
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
      <SidebarGroupLabel>Playgrounds</SidebarGroupLabel>
      <SidebarMenu className="gap-0">
        {!!repos.data.length ? (
          <>
            {repos.data.slice(0, 5).map((r) => (
              <SidebarMenuItem key={r.id}>
                <SidebarMenuButton>
                  <Link to={`/playgrounds/${r.id}`} className="truncate">
                    {r.name}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to={`/playgrounds`}>See All</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </>
        ) : (
          <div className="px-2 text-sm text-muted-foreground italic">
            No playgrounds yet
          </div>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
