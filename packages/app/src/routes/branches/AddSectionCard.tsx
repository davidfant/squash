import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SuggestedSection {
  id: string;
  title: string;
  description: string;
}

export function AddSectionCard({
  onAddSection,
}: {
  onAddSection: (title?: string) => void;
}) {
  const [isInputMode, setIsInputMode] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [suggestedSections, setSuggestedSections] = useState<
    SuggestedSection[]
  >([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCardClick = () => {
    if (!isInputMode) {
      setIsInputMode(true);
      setIsLoadingSuggestions(true);

      // Simulate loading suggested sections
      setTimeout(() => {
        setSuggestedSections([
          {
            id: "1",
            title: "Introduction",
            description: "Start with an overview",
          },
          {
            id: "2",
            title: "Problem Statement",
            description: "Define the core challenge",
          },
          {
            id: "3",
            title: "Solution Overview",
            description: "Outline your approach",
          },
          {
            id: "4",
            title: "Key Features",
            description: "Highlight main capabilities",
          },
        ]);
        setIsLoadingSuggestions(false);
      }, 1000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        onAddSection(inputValue.trim());
        setInputValue("");
        setIsInputMode(false);
        setSuggestedSections([]);
      }
    }
    if (e.key === "Escape") {
      setIsInputMode(false);
      setInputValue("");
      setSuggestedSections([]);
    }
  };

  const handleSuggestionClick = (suggestion: SuggestedSection) => {
    onAddSection(suggestion.title);
    setInputValue("");
    setIsInputMode(false);
    setSuggestedSections([]);
  };

  useEffect(() => {
    if (isInputMode && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isInputMode]);

  return (
    <div className="mx-auto w-[80%]">
      <Card
        className={cn(
          "border-2 border-border transition-colors duration-200 cursor-pointer group hover:border-primary",
          isInputMode && "border-primary"
        )}
        onClick={handleCardClick}
      >
        {!isInputMode ? (
          <div className="grid place-items-center p-4">
            <div className="p-2 text-muted-foreground rounded-full bg-border group-hover:bg-primary transition-colors">
              <Plus className="size-6 text-foreground-muted group-hover:text-primary-foreground transition-colors" />
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div>
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What would you like to add?"
                className="border-none shadow-none bg-transparent focus:ring-0 focus-visible:ring-0 p-0 rounded-none"
                onClick={(e) => e.stopPropagation()}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Press Enter to add • Escape to cancel
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                Suggested sections
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {isLoadingSuggestions
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="p-3 border rounded-md">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    ))
                  : suggestedSections.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="p-3 border rounded-md hover:bg-accent cursor-pointer transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSuggestionClick(suggestion);
                        }}
                      >
                        <h4 className="font-medium text-sm">
                          {suggestion.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {suggestion.description}
                        </p>
                      </div>
                    ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
