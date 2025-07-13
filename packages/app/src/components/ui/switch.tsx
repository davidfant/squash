import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/* ---------- variants ---------- */

const switchRootVariants = cva(
  // ── shared styles ────────────────────────────────────────────────────────────
  "peer inline-flex shrink-0 items-center rounded-full border border-transparent \
   shadow-xs transition-all outline-none \
   focus-visible:ring-[3px] focus-visible:border-ring focus-visible:ring-ring/50 \
   data-[state=checked]:bg-primary data-[state=unchecked]:bg-input \
   dark:data-[state=unchecked]:bg-input/80 \
   disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "h-4 w-6",
        md: "h-[1.15rem] w-8",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

const switchThumbVariants = cva(
  // ── shared styles ────────────────────────────────────────────────────────────
  "pointer-events-none rounded-full ring-0 transition-transform \
   data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 \
   bg-background \
   dark:data-[state=unchecked]:bg-foreground \
   dark:data-[state=checked]:bg-primary-foreground",
  {
    variants: {
      size: {
        sm: "size-3",
        md: "size-4",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

/* ---------- component ---------- */

export interface SwitchProps
  extends React.ComponentProps<typeof SwitchPrimitive.Root>,
    VariantProps<typeof switchRootVariants> {} // adds the `size` prop

export function Switch({ className, size, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(switchRootVariants({ size }), className)}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={switchThumbVariants({ size })}
      />
    </SwitchPrimitive.Root>
  );
}
