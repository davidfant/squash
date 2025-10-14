import type { RepoSuggestionColor } from "@squashai/api/agent/types";

export interface ChatSuggestion {
  title: string;
  prompt: string;
  icon: string;
  color: RepoSuggestionColor;
}
