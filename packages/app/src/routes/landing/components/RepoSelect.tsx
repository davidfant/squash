import { useChatInputContext } from "@/components/layout/chat/input/context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { BoxIcon, Check, WallpaperIcon } from "lucide-react";
import { Link } from "react-router";
import { useRepos } from "../hooks/useRepos";
import { useScreenshotUpload } from "../hooks/useScreenshotUpload";

export function RepoSelect({ disabled = false }: { disabled?: boolean }) {
  const input = useChatInputContext();
  const repos = useRepos();
  const uploadScreenshot = useScreenshotUpload();

  if (!repos.all?.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {repos.current ? (
          <Button variant="ghost" className="rounded-full" disabled={disabled}>
            <BoxIcon />
            {repos.current.name}
          </Button>
        ) : (
          <Button variant="ghost" className="rounded-full">
            <BoxIcon />
            New base
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Start from</DropdownMenuLabel>
        {repos.all?.map((repo) => (
          <DropdownMenuItem
            key={repo.id}
            onClick={() => repos.setCurrent(repo.id)}
          >
            <BoxIcon />
            {repo.name}
            {repo.id === repos.current?.id && (
              <Check className="ml-auto size-4" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            uploadScreenshot();
            input.setState({ type: "clone-screenshot" });
            repos.setCurrent(null);
          }}
        >
          <WallpaperIcon />
          Clone a screenshot
        </DropdownMenuItem>
        <Link to="/new/repo">
          <DropdownMenuItem>
            <SiGithub />
            Connect GitHub
          </DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
