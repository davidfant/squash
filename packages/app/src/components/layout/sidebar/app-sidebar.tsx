import * as React from "react";
import {
  GitBranch,
  Home,
  Settings,
  Moon,
  Sun,
  MoreHorizontal,
  FlaskConical,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FrameworkDetectionModal } from "@/components/layout/repo/FrameworkDetectionModal";
import { NavMain } from "./nav-main";
import { NavProjects } from "./nav-projects";
import { NavUser } from "./nav-user";
import { RepoSwitcher } from "./repo-switcher";
import { ThemeToggle } from "./theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { api, useQuery, useMutation } from "@/hooks/api";
import { authClient } from "@/auth";
import { useNavigate, Link } from "react-router";
import { useSelectedRepoId } from "@/routes/landing";

const navMainItems = [
  {
    title: "Home",
    url: "/",
    icon: Home,
    isActive: true,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
    items: [
      {
        title: "General",
        url: "#",
      },
      {
        title: "Integrations",
        url: "#",
      },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const session = authClient.useSession();
  const [frameworkModalOpen, setFrameworkModalOpen] = React.useState(false);
  const [selectedRepoForFramework, setSelectedRepoForFramework] = React.useState<{ id: string; name: string } | null>(null);
  const navigate = useNavigate();
  const repos = useQuery(api.repos.$get, { params: {} });
  const [selectedRepoId] = useSelectedRepoId();
  
  // Get branches for the selected repo
  const branches = useQuery(api.repos[":repoId"].branches.$get, {
    params: { repoId: selectedRepoId || "" },
    enabled: !!selectedRepoId,
  });

  const selectedRepo = repos.data?.find(repo => repo.id === selectedRepoId);

  const userData = session.data?.user ? {
    name: session.data.user.name || "User",
    email: session.data.user.email || "",
    avatar: session.data.user.image || "",
  } : null;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {repos.data && (
          <RepoSwitcher repos={repos.data.map(repo => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.name,  // Using name as fullName since fullName doesn't exist
          }))} />
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        
        {/* Branches Section */}
        <SidebarGroup>
          <div className="flex items-center justify-between mb-2">
            <SidebarGroupLabel>Branches</SidebarGroupLabel>
            {selectedRepo && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Repository options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => {
                      setSelectedRepoForFramework(selectedRepo);
                      setFrameworkModalOpen(true);
                    }}
                  >
                    <FlaskConical className="mr-2 h-4 w-4" />
                    Detect Framework
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {selectedRepoId && branches.data ? (
            <SidebarMenu>
              {branches.data.length > 0 ? (
                branches.data
                  .filter((branch): branch is NonNullable<typeof branch> => 
                    branch != null && 
                    branch.id != null && 
                    branch.name != null
                  )
                  .map((branch) => (
                    <SidebarMenuItem key={branch.id}>
                      <SidebarMenuButton asChild>
                        <Link to={`/branches/${branch.id}`}>
                          <GitBranch className="h-4 w-4" />
                          <span>{branch.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No branches yet
                </div>
              )}
            </SidebarMenu>
          ) : !selectedRepoId ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Select a repository to view branches
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Loading branches...
            </div>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Toggle theme"
              onClick={() => {
                const isDark = document.documentElement.classList.contains('dark');
                const newTheme = isDark ? 'light' : 'dark';
                localStorage.setItem('theme', newTheme);
                if (newTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              }}
            >
              {(() => {
                const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
                React.useEffect(() => {
                  const checkTheme = () => {
                    const isDark = document.documentElement.classList.contains('dark');
                    setTheme(isDark ? 'dark' : 'light');
                  };
                  checkTheme();
                  const observer = new MutationObserver(checkTheme);
                  observer.observe(document.documentElement, { 
                    attributes: true, 
                    attributeFilter: ['class'] 
                  });
                  return () => observer.disconnect();
                }, []);
                return theme === 'light' ? <Moon /> : <Sun />;
              })()}
              <span>Appearance</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {userData && <NavUser user={userData} />}
      </SidebarFooter>
      <SidebarRail />
      
      {selectedRepoForFramework && (
        <FrameworkDetectionModal
          open={frameworkModalOpen}
          onOpenChange={setFrameworkModalOpen}
          repoId={selectedRepoForFramework.id}
          repoName={selectedRepoForFramework.name}
          onSave={(framework) => {
            // TODO: Handle saving the framework configuration
            console.log("Saving framework config:", framework);
            repos.refetch();
          }}
        />
      )}
    </Sidebar>
  );
} 