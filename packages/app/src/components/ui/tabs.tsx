import { cn } from "@/lib/utils";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import * as React from "react";

const TabsContext = React.createContext<string | undefined>(undefined);

export function useActiveTab() {
  return React.useContext(TabsContext);
}

export function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const [active, setActive] = React.useState<string | undefined>(
    value ?? defaultValue
  );

  React.useEffect(() => {
    if (value !== undefined) setActive(value);
  }, [value]);

  const handleChange = React.useCallback(
    (val: string) => {
      setActive(val);
      onValueChange?.(val);
    },
    [onValueChange]
  );

  return (
    <TabsContext.Provider value={active}>
      <TabsPrimitive.Root
        data-slot="tabs"
        className={cn("flex flex-col gap-2", className)}
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleChange}
        {...props}
      />
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-8 w-fit items-center justify-center rounded-lg p-px",
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  children,
  value,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const active = React.useContext(TabsContext);
  return (
    <TabsPrimitive.Trigger
      value={value}
      data-slot="tabs-trigger"
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer",
        "relative",
        className
      )}
      {...props}
    >
      {active === value && (
        <motion.span
          layoutId="tabs-pill"
          className="absolute inset-0 rounded-md bg-background dark:bg-input/30 shadow-sm pointer-events-none"
          transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}
