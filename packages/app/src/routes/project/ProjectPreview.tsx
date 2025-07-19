import { useChat } from "@/components/layout/chat/context";
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
  const { selectedPage } = useProjectContext();
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

  return (
    <div className="h-full overflow-y-scroll">
      {selectedPage.sections.map((section) => {
        const selectedVariant = section.variants.find(
          (variant) => variant.selected
        );

        if (!selectedVariant) return null;

        return (
          <div
            key={section.id}
            ref={(el) => {
              sectionRefs.current[section.id] = el;
            }}
            className={`
                ${getRandomLightColor()} 
                h-64 flex flex-col items-center justify-center text-center
                cursor-pointer hover:opacity-80 transition-opacity
              `}
            onClick={() =>
              handleVariantClick(section.id, selectedVariant.label)
            }
          >
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {section.label}
            </h3>
            <p className="text-lg font-semibold">{selectedVariant.label}</p>
          </div>
        );
      })}
    </div>
  );
}
