import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function InlineEditCommand() {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [isUpdatingSuggestions, setIsUpdatingSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const throttleRef = useRef<number | undefined>(undefined);
  const updateTimeoutRef = useRef<number | undefined>(undefined);

  // Mock function to simulate getting suggestions
  const getSuggestions = useCallback(
    async (text: string): Promise<string[]> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const baseSuggestions = [
            "Make the image more vibrant and colorful",
            "Change the text to be more engaging",
            "Update the layout to be more modern",
            "Improve the typography for better readability",
            "Add more visual elements to enhance design",
            "Optimize the spacing and alignment",
          ];

          // Filter suggestions based on input text
          const filtered = text
            ? baseSuggestions
                .filter(
                  (s) =>
                    s.toLowerCase().includes(text.toLowerCase()) ||
                    Math.random() > 0.3
                )
                .slice(0, 3)
            : baseSuggestions.slice(0, 3);

          resolve(filtered);
        }, 3000);
      });
    },
    []
  );

  // Initial suggestions load
  useEffect(() => {
    getSuggestions("").then((initialSuggestions) => {
      setSuggestions(initialSuggestions);
      setIsLoadingSuggestions(false);
    });
  }, [getSuggestions]);

  // Throttled text change handler
  const handleTextChange = useCallback(
    (text: string) => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }

      throttleRef.current = setTimeout(() => {
        setIsUpdatingSuggestions(true);
        setSelectedIndex(-1); // Reset selection when suggestions change

        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }

        updateTimeoutRef.current = setTimeout(async () => {
          const newSuggestions = await getSuggestions(text);
          setSuggestions(newSuggestions);
          setIsUpdatingSuggestions(false);
        }, 100); // Small delay to simulate API call start
      }, 2000);
    },
    [getSuggestions]
  );

  // Handle text change
  const onTextChange = (newValue: string) => {
    setValue(newValue);
    if (!isSubmitting) {
      handleTextChange(newValue);
    }
  };

  // Handle suggestion selection
  const selectSuggestion = (suggestion: string) => {
    setValue(suggestion);
    handleSubmit(suggestion);
  };

  // Handle submit
  const handleSubmit = async (text = value) => {
    if (!text.trim()) return;

    setIsSubmitting(true);
    setSuggestions([]);

    // Simulate submission
    setTimeout(() => {
      setIsSubmitting(false);
      setValue("");
      // Reset suggestions after submission
      getSuggestions("").then((initialSuggestions) => {
        setSuggestions(initialSuggestions);
        setSelectedIndex(-1);
      });
    }, 3000);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isSubmitting) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
      setSelectedIndex(newIndex);
      if (newIndex >= 0 && suggestions[newIndex]) {
        setValue(suggestions[newIndex]);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = Math.max(selectedIndex - 1, -1);
      setSelectedIndex(newIndex);
      if (newIndex >= 0 && suggestions[newIndex]) {
        setValue(suggestions[newIndex]);
      } else {
        setValue("");
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        selectSuggestion(suggestions[selectedIndex]);
      } else {
        handleSubmit();
      }
    }
  };

  return (
    <Card className="py-1 gap-1">
      {/* Input row */}
      <div className="flex items-center gap-2 pl-3 pr-1">
        <div className="flex-shrink-0">
          <Sparkles className="size-4 text-muted-foreground" />
        </div>

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask for quick changes..."
          autoFocus
          className="flex-1 border-none shadow-none bg-transparent focus:ring-0 focus-visible:ring-0 px-0"
          disabled={isSubmitting}
        />

        <Button
          size="icon"
          onClick={() => handleSubmit()}
          disabled={!value.trim() || isSubmitting}
          className="rounded-full flex-shrink-0"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowUp className="size-4" />
          )}
        </Button>
      </div>

      {/* Separator */}
      <Separator className="mb-2" />

      {/* Suggestions section */}
      {!isSubmitting && (
        <div>
          <div className="flex items-center gap-2 px-3">
            <Label className="text-xs text-muted-foreground">Suggestions</Label>
            {isUpdatingSuggestions && (
              <Loader2 className="size-3 animate-spin text-muted-foreground" />
            )}
          </div>

          <div>
            {isLoadingSuggestions ? (
              // Loading skeletons with varying widths
              <div className="space-y-2 py-1 px-3">
                <Skeleton className="h-6 w-4/5" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-5/6" />
              </div>
            ) : (
              suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => selectSuggestion(suggestion)}
                  className={cn(
                    "relative flex cursor-default items-center gap-2 rounded-sm mx-1 px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground transition-colors",
                    selectedIndex === index &&
                      "bg-accent text-accent-foreground"
                  )}
                >
                  {suggestion}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Submit state skeleton */}
      {isSubmitting && (
        <div className="space-y-2 px-3">
          <span className="text-sm font-medium text-muted-foreground">
            Processing...
          </span>
          <Skeleton className="h-8 w-full" />
        </div>
      )}
    </Card>
  );
}
