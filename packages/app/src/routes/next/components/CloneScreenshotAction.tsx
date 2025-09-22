import { Suggestion } from "@/components/ai-elements/suggestion";
import { type ChatInputFile } from "@/components/layout/file/useFileUpload";
import { WallpaperIcon } from "lucide-react";
import { useScreenshotUpload } from "../hooks/useScreenshotUpload";

interface CloneScreenshotProps {
  onScreenshotUploaded: (file: ChatInputFile) => void;
}

export function CloneScreenshotAction({
  onScreenshotUploaded,
}: CloneScreenshotProps) {
  const { uploadScreenshot } = useScreenshotUpload();

  return (
    <Suggestion
      size="default"
      suggestion="Clone a screenshot"
      onClick={() => uploadScreenshot(onScreenshotUploaded)}
    >
      <WallpaperIcon />
      Clone a screenshot
    </Suggestion>
  );
}
