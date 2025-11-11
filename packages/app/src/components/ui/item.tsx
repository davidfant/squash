import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { forwardRef } from "react";

export type ItemProps = ComponentProps<"div"> & {
  variant?: "default" | "outline";
  size?: "default" | "sm";
  asChild?: boolean;
};

export const Item = forwardRef<HTMLDivElement, ItemProps>(
  (
    { className, variant = "default", size = "default", asChild, ...props },
    ref
  ) => {
    const Component = asChild ? "div" : "div";
    return (
      <Component
        ref={ref}
        className={cn(
          "flex items-center gap-3 rounded-lg p-3 transition-colors",
          variant === "outline" && "border",
          size === "sm" && "p-2",
          className
        )}
        {...props}
      />
    );
  }
);
Item.displayName = "Item";

export type ItemMediaProps = ComponentProps<"div">;

export const ItemMedia = forwardRef<HTMLDivElement, ItemMediaProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex shrink-0 items-center justify-center", className)}
      {...props}
    />
  )
);
ItemMedia.displayName = "ItemMedia";

export type ItemContentProps = ComponentProps<"div">;

export const ItemContent = forwardRef<HTMLDivElement, ItemContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex-1 min-w-0", className)} {...props} />
  )
);
ItemContent.displayName = "ItemContent";

export type ItemTitleProps = ComponentProps<"div">;

export const ItemTitle = forwardRef<HTMLDivElement, ItemTitleProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-sm font-medium leading-none", className)}
      {...props}
    />
  )
);
ItemTitle.displayName = "ItemTitle";

export type ItemDescriptionProps = ComponentProps<"div">;

export const ItemDescription = forwardRef<HTMLDivElement, ItemDescriptionProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mt-1 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
);
ItemDescription.displayName = "ItemDescription";

export type ItemActionsProps = ComponentProps<"div">;

export const ItemActions = forwardRef<HTMLDivElement, ItemActionsProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex shrink-0 items-center", className)}
      {...props}
    />
  )
);
ItemActions.displayName = "ItemActions";
