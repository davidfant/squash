import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, useQuery } from "@/hooks/api";
import { cn } from "@/lib/utils";
import { FlaskConical, FolderGit2, Plus } from "lucide-react";
import { Link, useLocation } from "react-router";

export function PlaygroundsSidebar() {
  const repos = useQuery(api.repos.$get, { params: {} });
  const location = useLocation();

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Link to="/">
          <Logo />
        </Link>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          {/* Playgrounds Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Playgrounds
              </h2>
              <Button size="icon" variant="ghost" className="size-5" asChild>
                <Link to="/new/repo">
                  <Plus className="size-3" />
                </Link>
              </Button>
            </div>
            <nav className="space-y-1">
              {repos.isPending ? (
                [...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-9 rounded-md bg-muted animate-pulse"
                  />
                ))
              ) : repos.data && repos.data.length > 0 ? (
                repos.data.map((repo) => (
                  <Link key={repo.id} to={`/playgrounds?repo=${repo.id}`}>
                    <button
                      className={cn(
                        "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                        location.search.includes(repo.id) &&
                          "bg-accent font-medium"
                      )}
                    >
                      <FolderGit2 className="size-4 shrink-0" />
                      <span className="truncate">{repo.name}</span>
                    </button>
                  </Link>
                ))
              ) : (
                <p className="px-2 text-xs text-muted-foreground">
                  No playgrounds yet
                </p>
              )}
            </nav>
          </div>

          {/* Experiments Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Experiments
              </h2>
              <Button size="icon" variant="ghost" className="size-5" asChild>
                <Link to="/">
                  <Plus className="size-3" />
                </Link>
              </Button>
            </div>
            <nav className="space-y-1">
              <Link to="/">
                <button className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent">
                  <FlaskConical className="size-4 shrink-0" />
                  <span className="truncate">Quick prototypes</span>
                </button>
              </Link>
            </nav>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
