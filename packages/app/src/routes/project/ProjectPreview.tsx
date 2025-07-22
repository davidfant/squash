import { useChat } from "@/components/layout/chat/context";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas-pro";
import { useRef } from "react";
import { useProjectContext } from "./context";

const lightColors = [
  "bg-red-100",
  "bg-blue-100",
  "bg-green-100",
  "bg-yellow-100",
  "bg-purple-100",
  "bg-pink-100",
  "bg-indigo-100",
  "bg-orange-100",
  "bg-teal-100",
  "bg-cyan-100",
  "bg-lime-100",
  "bg-emerald-100",
  "bg-violet-100",
  "bg-fuchsia-100",
  "bg-rose-100",
  "bg-sky-100",
  "bg-amber-100",
];

const getRandomLightColor = () => {
  return lightColors[Math.floor(Math.random() * lightColors.length)];
};

export function ProjectPreview() {
  const { selectedPage, screenSize } = useProjectContext();
  const { sendMessage } = useChat();
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleVariantClick = async (
    sectionId: string,
    variantLabel: string
  ) => {
    const sectionElement = sectionRefs.current[sectionId];
    if (!sectionElement) return;

    try {
      // Take screenshot of the section
      const canvas = await html2canvas(sectionElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });

      // Convert to base64
      const imageDataUrl = canvas.toDataURL("image/png");

      // Show alert for feedback
      const feedback = prompt(
        `Please provide feedback for the "${variantLabel}" variant:`
      );

      if (feedback) {
        // Send message with feedback and screenshot
        await sendMessage([
          {
            type: "text",
            text: `User feedback for "${variantLabel}" variant: ${feedback}`,
          },
          {
            type: "image",
            image: imageDataUrl,
          },
        ]);
      }
    } catch (error) {
      console.error("Error taking screenshot:", error);
      alert("Failed to take screenshot. Please try again.");
    }
  };

  if (!selectedPage) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No page selected
      </div>
    );
  }

  // Define width classes based on screen size
  const getPreviewWidth = () => {
    switch (screenSize) {
      case "mobile":
        return "w-[375px]"; // Mobile width
      case "tablet":
        return "w-[768px]"; // Tablet width
      case "desktop":
        return "w-full";
    }
  };

  return (
    <iframe
      className={cn(
        "h-full mx-auto transition-all duration-300",
        getPreviewWidth()
      )}
      src="http://localhost:5174"
    />
  );
}
