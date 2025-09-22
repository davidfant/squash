import { Suggestion } from "@/components/ai-elements/suggestion";
import { WallpaperIcon } from "lucide-react";
import { useRepos } from "../hooks/useRepos";
import { useScreenshotUpload } from "../hooks/useScreenshotUpload";

export function CloneScreenshotAction() {
  const uploadScreenshot = useScreenshotUpload();
  const repos = useRepos();

  return (
    <Suggestion
      size="default"
      suggestion="Clone a screenshot"
      onClick={() => {
        uploadScreenshot();
        repos.setCurrent(null);
      }}
    >
      <WallpaperIcon />
      Clone a screenshot
    </Suggestion>
  );
}
