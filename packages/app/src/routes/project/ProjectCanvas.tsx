import { SectionToolbar } from "@/components/layout/toolbar/SectionToolbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AddSectionCard } from "./AddSectionCard";
import { InlineEditCommand } from "./InlineEditCommand";

interface Section {
  label: string;
  variants: string[];
}

function PageSectionVariants({
  active,
  section,
}: {
  active: boolean;
  section: Section;
}) {
  const [variantIndex, setVariantIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const handleVariantChange = (direction: number) => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const newVariant = Math.max(
      0,
      Math.min(section.variants.length - 1, variantIndex + direction)
    );

    const containerWidth = scrollContainer.offsetWidth;
    const itemWidth = containerWidth * 0.9;
    const gap = 16;
    const scrollPosition = newVariant * (itemWidth + gap);

    scrollContainer.scrollTo({ left: scrollPosition, behavior: "smooth" });
  };

  const canGoNextVariant = active && variantIndex < section.variants.length - 1;
  const canGoPreviousVariant = active && variantIndex > 0;

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let timeout: number;
    const throttledHandler = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const scrollLeft = scrollContainer.scrollLeft;
        const containerWidth = scrollContainer.offsetWidth;
        const itemWidth = containerWidth * 0.9; // w-9/10 = 90%
        const gap = 16; // gap-4 = 1rem = 16px

        // Calculate which variant is closest to center
        const variantIndex = Math.round(scrollLeft / (itemWidth + gap));
        const clampedVariant = Math.max(
          0,
          Math.min(section.variants.length - 1, variantIndex)
        );

        setVariantIndex(clampedVariant);
      }, 10);
    };

    scrollContainer.addEventListener("scroll", throttledHandler);

    return () =>
      scrollContainer.removeEventListener("scroll", throttledHandler);
  }, [section.variants.length]);

  return (
    <div className="relative">
      {/* Fade masks */}
      <div
        className="absolute inset-y-0 left-0 w-[10%] bg-gradient-to-r from-muted to-transparent z-10 cursor-pointer"
        onClick={() => handleVariantChange(-1)}
      />
      <div
        className="absolute inset-y-0 right-0 w-[10%] bg-gradient-to-l from-muted to-transparent z-10 cursor-pointer"
        onClick={() => handleVariantChange(1)}
      />

      <Button
        size="icon"
        variant="outline"
        onClick={() => handleVariantChange(-1)}
        className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 z-20 rounded-full transition-opacity duration-300",
          canGoPreviousVariant ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronLeft />
      </Button>

      <Button
        size="icon"
        variant="outline"
        onClick={() => handleVariantChange(1)}
        className={cn(
          "absolute right-4 top-1/2 -translate-y-1/2 z-20 rounded-full transition-opacity duration-300",
          canGoNextVariant ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronRight />
      </Button>

      <div
        ref={scrollRef}
        className="flex snap-x overflow-x-auto snap-mandatory scrollbar-hide gap-4"
      >
        <div className="w-[20%] shrink-0" />
        {section.variants.map((variant, i) => (
          <div
            key={i}
            className={cn(
              "w-[80%] shrink-0 snap-center transition-opacity duration-300"
              // variantIndex === i ? "opacity-100" : "opacity-30"
            )}
          >
            <Card
              className={cn(
                "border-2 transition-colors duration-200 cursor-pointer hover:border-primary min-h-[200px] p-4",
                active && variantIndex === i && "border-primary"
              )}
            >
              <div className="text-lg font-medium">{section.label}</div>
              <div className="text-sm text-muted-foreground">{variant}</div>
            </Card>
          </div>
        ))}
        <div className="w-[20%] shrink-0" />
      </div>
    </div>
  );
}

export function ProjectCanvas() {
  const [sections, setSections] = useState<Section[]>([
    { label: "Hero", variants: ["A", "B", "C", "D", "E"] },
    { label: "Not Hero", variants: ["D", "E", "F"] },
  ]);
  const [activeSection, setActiveSection] = useState<number>(0);

  return (
    <div className="h-full w-full bg-muted space-y-4 py-8">
      {sections.map((section, index) => (
        <PageSectionVariants
          key={index}
          active={activeSection === index}
          section={section}
        />
      ))}
      <AddSectionCard
        onAddSection={() => {
          setSections((prev) => [
            ...prev,
            { label: "New Section", variants: ["X", "Y", "Z"] },
          ]);
        }}
      />
      <div className="w-[50%] min-w-md mx-auto space-y-12">
        <SectionToolbar submitting={false} onDeleteSection={console.log} />
        <InlineEditCommand />
      </div>
    </div>
  );
}
