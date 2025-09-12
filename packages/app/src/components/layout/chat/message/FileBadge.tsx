"use client";
import { Badge } from "@/components/ui/badge";
import {
  SiCss,
  SiHtml5,
  SiJavascript,
  SiMarkdown,
  SiReact,
  SiTypescript,
} from "@icons-pack/react-simple-icons";
import { Braces } from "lucide-react";

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

export function FileBadge({ path }: { path: string }) {
  const name = path.split("/").pop()!;
  const icon = iconMap[name.split(".").pop() as keyof typeof iconMap];
  return (
    <Badge variant="outline" className="border-none bg-muted">
      {icon && <icon.component color={icon.color} className="size-4" />}
      <span>{name}</span>
    </Badge>
  );
}
