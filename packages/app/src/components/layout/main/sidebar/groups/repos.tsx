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
              <Link key={r.id} to={`/templates/${r.id}`} className="truncate">
                <SidebarMenuItem>
                  <SidebarMenuButton className="cursor-pointer">
                    {r.name}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Link>
            ))}
            <Link to="/templates" className="truncate">
              <SidebarMenuItem>
                <SidebarMenuButton className="cursor-pointer">
                  See All
                </SidebarMenuButton>
              </SidebarMenuItem>
            </Link>
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
