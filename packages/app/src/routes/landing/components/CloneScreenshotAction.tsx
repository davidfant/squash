import { Suggestion } from "@/components/ai-elements/suggestion";
import { useChatInputContext } from "@/components/layout/chat/input/context";
import { WallpaperIcon } from "lucide-react";
import { useRepos } from "../hooks/useRepos";
import { useScreenshotUpload } from "../hooks/useScreenshotUpload";

export function CloneScreenshotAction() {
  const uploadScreenshot = useScreenshotUpload();
  const repos = useRepos();
  const input = useChatInputContext();

  return (
    <Suggestion
      suggestion="Clone a screenshot"
      onClick={() => {
        uploadScreenshot();
        input.setState({ type: "clone-screenshot" });
        repos.setCurrent(null);
      }}
    >
      <WallpaperIcon />
      Clone a screenshot
    </Suggestion>
  );
}
