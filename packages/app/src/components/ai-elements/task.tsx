"use client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  SiCss,
  SiHtml5,
  SiJavascript,
  SiMarkdown,
  SiReact,
  SiTypescript,
} from "@icons-pack/react-simple-icons";
import {
  Braces,
  ChevronDownIcon,
  SearchIcon,
  type LucideIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

const iconMap = {
  jsx: { component: SiReact, color: "#149ECA" },
  tsx: { component: SiReact, color: "#149ECA" },
  ts: { component: SiTypescript, color: "#3178C6" },
  js: { component: SiJavascript, color: "#F7DF1E" },
  css: { component: SiCss, color: "#1572B6" },
  html: { component: SiHtml5, color: "#E34F26" },
  json: { component: Braces, color: "#b8b73c" },
  md: { component: SiMarkdown, color: "#000000" },
};

export type TaskItemFileProps = ComponentProps<"div"> & {
  name: string;
};

export function TaskItemFile({ name, className, ...props }: TaskItemFileProps) {
  const icon = iconMap[name.split(".").pop() as keyof typeof iconMap];
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border bg-muted/50 px-1.5 py-0.5 text-foreground text-xs",
        className
      )}
      {...props}
    >
      {icon && <icon.component color={icon.color} className="size-4" />}

      <span>{name}</span>
    </div>
  );
}

export type TaskItemProps = ComponentProps<"div">;

export const TaskItem = ({ children, className, ...props }: TaskItemProps) => (
  <div className={cn("text-muted-foreground text-sm", className)} {...props}>
    {children}
  </div>
);

export type TaskProps = ComponentProps<typeof Collapsible>;

export const Task = ({
  defaultOpen = true,
  className,
  ...props
}: TaskProps) => (
  <Collapsible className={className} defaultOpen={defaultOpen} {...props} />
);

export type TaskTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  title: ReactNode;
  icon?: LucideIcon;
};

export const TaskTrigger = ({
  children,
  className,
  icon: Icon = SearchIcon,
  title,
  ...props
}: TaskTriggerProps) => (
  <CollapsibleTrigger asChild className={cn("group", className)} {...props}>
    {children ?? (
      <div className="flex w-full cursor-pointer items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground">
        <Icon className="size-4" />
        <p className="text-sm">{title}</p>
        <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
      </div>
    )}
  </CollapsibleTrigger>
);

export type TaskContentProps = ComponentProps<typeof CollapsibleContent>;

export const TaskContent = ({
  children,
  className,
  ...props
}: TaskContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  >
    <div className="mt-4 space-y-2 border-muted border-l-2 pl-4">
      {children}
    </div>
  </CollapsibleContent>
);
