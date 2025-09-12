import { Action, Actions } from "@/components/ai-elements/actions";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import type { VariantOptions } from "../messageLineage";

interface MessageVariantButtonsProps {
  variants: VariantOptions | undefined;
  className?: string;
  onEdit(): void;
  // onRetry(): void;
  onVariantChange(parentId: string, childId: string): void;
}

export function UserMessageActions({
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
    <Actions className={className}>
      <Action tooltip="Edit message" onClick={onEdit}>
        <Pencil className="size-4" />
      </Action>

      {hasVariants && (
        <>
          <Action tooltip="Previous variant" onClick={handlePreviousVariant}>
            <ChevronLeft className="size-4" />
          </Action>
          <span className="text-xs text-muted-foreground min-w-[2rem] text-center">
            {currentIndex + 1}/{totalVariants}
          </span>
          <Action tooltip="Next variant" onClick={handleNextVariant}>
            <ChevronRight className="size-4" />
          </Action>
        </>
      )}
    </Actions>
  );
}
