import { Suggestion } from "@/components/ai-elements/suggestion";
import {
  useFileUpload,
  type ChatInputFile,
} from "@/components/layout/file/useFileUpload";
import { toast } from "@/components/ui/sonner";
import { ImageUp } from "lucide-react";
import { useCallback } from "react";

interface CloneScreenshotProps {
  onScreenshotUploaded: (file: ChatInputFile) => void;
}

export function CloneScreenshotAction({
  onScreenshotUploaded,
}: CloneScreenshotProps) {
  const fileUpload = useFileUpload();

  const handleFileSelect = useCallback(() => {
    // Create a temporary file input specifically for images
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = false;

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      // Add to upload queue
      fileUpload.add([file]);

      // Monitor upload progress and notify when complete
      const checkUploadStatus = () => {
        const uploadedFile = fileUpload.files.find(
          (f) => f.filename === file.name && f.status === "uploaded"
        );

        if (uploadedFile) {
          onScreenshotUploaded(uploadedFile);
        } else {
          // Check again in 100ms if still uploading
          const stillUploading = fileUpload.files.find(
            (f) => f.filename === file.name && f.status === "uploading"
          );
          if (stillUploading) {
            setTimeout(checkUploadStatus, 100);
          }
        }
      };

      // Start monitoring
      setTimeout(checkUploadStatus, 100);
    };

    input.click();
  }, [fileUpload, onScreenshotUploaded]);

  return (
    <Suggestion
      size="default"
      suggestion="Clone a screenshot"
      onClick={handleFileSelect}
    >
      <ImageUp className="h-4 w-4" />
      Clone a screenshot
    </Suggestion>
  );
}
