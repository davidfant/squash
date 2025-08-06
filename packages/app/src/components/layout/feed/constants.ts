import { Bug, Palette, Sparkles, Zap } from "lucide-react";
import type { Suggestion } from "./SuggestionPills";

export const defaultSuggestions: Suggestion[] = [
  {
    text: "Build a feature",
    icon: Sparkles,
    prompt: "Help me create a feature that...",
  },
  {
    text: "Fix a bug",
    icon: Bug,
    prompt: "Help me fix a bug where...",
  },
  {
    text: "Update design",
    icon: Palette,
    prompt: "Help me update the design to...",
  },
  {
    text: "Improve performance",
    icon: Zap,
    prompt: "Help me improve performance by...",
  },
]; 