import { useChatInputFileUploads } from "@/components/layout/chat/input/ChatInputFileUploadsContext";
import { toast } from "@/components/ui/sonner";
import { useCallback } from "react";

export function useScreenshotUpload() {
  const fileUpload = useChatInputFileUploads();
  return useCallback(() => {
    // Create a temporary file input specifically for images
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = false;

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      await fileUpload.add([file]);
    };

    input.click();
  }, [fileUpload]);
}
