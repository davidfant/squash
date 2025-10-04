import { useChatInputContext } from "@/components/layout/chat/input/context";
import { toast } from "@/components/ui/sonner";
import { useCallback } from "react";

export function useScreenshotUpload() {
  const input = useChatInputContext();
  return useCallback(() => {
    // Create a temporary file input specifically for images
    const inputEl = document.createElement("input");
    inputEl.type = "file";
    inputEl.accept = "image/*";
    inputEl.multiple = false;

    inputEl.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      await input.addFile([file]);
      // input.setState({ type: "clone-screenshot" });
      if (!input.text) {
        input.setText("Clone this screenshot");
      }
    };

    inputEl.click();
  }, [input]);
}
