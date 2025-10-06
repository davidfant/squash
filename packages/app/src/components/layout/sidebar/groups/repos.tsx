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
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Playgrounds</SidebarGroupLabel>
      {repos.data ? (
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
      ) : (
        <SidebarMenu>
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </SidebarMenu>
      )}
    </SidebarGroup>
  );
}
