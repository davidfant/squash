import { Button } from "@/components/ui/button";
import { type ElementType } from "react";

export interface Suggestion {
  text: string;
  icon: ElementType;
  prompt: string;
}

interface SuggestionPillsProps {
  suggestions: Suggestion[];
  onSuggestionClick: (prompt: string) => void;
}

export function SuggestionPills({ suggestions, onSuggestionClick }: SuggestionPillsProps) {
  return (
    <div className="flex flex-wrap gap-3 mt-4">
      {suggestions.map((s) => (
        <Button
          key={s.text}
          variant="outline"
          size="default"
          className="h-10 px-5 gap-2.5 font-normal text-muted-foreground hover:text-foreground"
          onClick={() => onSuggestionClick(s.prompt)}
        >
          <s.icon className="h-4 w-4" />
          {s.text}
        </Button>
      ))}
    </div>
  );
} 