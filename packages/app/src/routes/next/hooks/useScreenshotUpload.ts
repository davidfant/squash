import { useChatInputFileUploads } from "@/components/layout/chat/input/ChatInputFileUploadsContext";
import { type ChatInputFile } from "@/components/layout/file/useFileUpload";
import { toast } from "@/components/ui/sonner";
import { useCallback } from "react";

export function useScreenshotUpload() {
  const fileUpload = useChatInputFileUploads();

  const uploadScreenshot = useCallback(
    (onScreenshotUploaded: (file: ChatInputFile) => void) => {
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
    },
    [fileUpload]
  );

  return { uploadScreenshot };
}
