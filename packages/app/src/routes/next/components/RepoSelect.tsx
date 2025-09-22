import { type ChatInputFile } from "@/components/layout/file/useFileUpload";
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
import { useCurrentRepo } from "../hooks/useCurrentRepo";
import { useScreenshotUpload } from "../hooks/useScreenshotUpload";

export function RepoSelect({
  disabled,
  onScreenshotUploaded,
}: {
  disabled?: boolean;
  onScreenshotUploaded?: (file: ChatInputFile) => void;
}) {
  const { repos, currentRepo, setCurrentRepoId } = useCurrentRepo();
  const { uploadScreenshot } = useScreenshotUpload();

  if (!repos || repos?.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="rounded-full" disabled={disabled}>
          <BoxIcon />
          {currentRepo?.name ?? "Select repo"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Start from</DropdownMenuLabel>
        {repos?.map((repo) => (
          <DropdownMenuItem
            key={repo.id}
            onClick={() => setCurrentRepoId(repo.id)}
          >
            <BoxIcon />
            {repo.name}
            {repo.id === currentRepo?.id && (
              <Check className="ml-auto size-4" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => uploadScreenshot(onScreenshotUploaded || (() => {}))}
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
