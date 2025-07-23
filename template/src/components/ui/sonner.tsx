import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps, toast } from "sonner";
import { buttonVariants } from "./button";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "light" } = useTheme();
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "bg-popover text-popover-foreground border border-border flex items-center px-4 py-2 gap-2 rounded-lg shadow-xl min-h-12",
          title: "text-foreground",
          description: "text-muted-foreground",
          actionButton: cn(buttonVariants({ size: "sm" }), "ml-auto"),
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
