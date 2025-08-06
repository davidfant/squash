import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import type { VariantOptions } from "../messageLineage";

interface MessageVariantButtonsProps {
  variants: VariantOptions | undefined;
  className?: string;
  onEdit(): void;
  // onRetry(): void;
  onVariantChange(parentId: string, childId: string): void;
}

export function UserMessageFooter({
  className,
  variants,
  onEdit,
  // onRetry,
  onVariantChange,
}: MessageVariantButtonsProps) {
  const hasVariants = !!variants?.options?.length;
  const currentIndex = variants?.activeIndex ?? 0;
  const totalVariants = variants?.options?.length ?? 0;

  const handlePreviousVariant = () => {
    if (!variants) return;
    const newIndex = currentIndex > 0 ? currentIndex - 1 : totalVariants - 1;
    const targetOption = variants.options[newIndex];
    if (targetOption) {
      onVariantChange(variants.parentId, targetOption.id);
    }
  };

  const handleNextVariant = () => {
    if (!variants) return;
    const newIndex = currentIndex < totalVariants - 1 ? currentIndex + 1 : 0;
    const targetOption = variants.options[newIndex];
    if (targetOption) {
      onVariantChange(variants.parentId, targetOption.id);
    }
  };

  return (
    <div className={cn("flex items-center", className)}>
      {onEdit && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onEdit}
            >
              <Pencil />
              <span className="sr-only">Edit message</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Edit message</TooltipContent>
        </Tooltip>
      )}

      {/* Retry Button */}
      {/* {onRetry && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRetry}
            >
              <RotateCcw className="h-3 w-3" />
              <span className="sr-only">Retry message</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Retry message</p>
          </TooltipContent>
        </Tooltip>
      )} */}

      {hasVariants && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={handlePreviousVariant}
                disabled={totalVariants <= 1}
              >
                <ChevronLeft />
                <span className="sr-only">Previous variant</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Previous variant</p>
            </TooltipContent>
          </Tooltip>

          <span className="text-xs text-muted-foreground min-w-[2rem] text-center">
            {currentIndex + 1}/{totalVariants}
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={handleNextVariant}
                disabled={totalVariants <= 1}
              >
                <ChevronRight />
                <span className="sr-only">Next variant</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Next variant</p>
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}
