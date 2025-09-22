import { useEffect, useState } from "react";

export const placeholderSuffixes = [
  "research loan underwriting data...",
  "review employment contracts...",
  "find all quantum computing researchers in the US...",
];

export function useChatInputPlaceholder() {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    let index = 0;
    let incrementing = true;
    const abortController = new AbortController();
    const suffix = placeholderSuffixes[exampleIndex]!;
    async function tick() {
      if (abortController.signal.aborted) return;
      if (incrementing) {
        index++;
        setCharIndex(index);
        if (index === suffix.length) {
          incrementing = false;
          await new Promise((resolve) => setTimeout(resolve, 1_000));
        }
      } else {
        index--;
        setCharIndex(index);
        if (index === 0) {
          incrementing = true;
          await new Promise((resolve) => setTimeout(resolve, 500));
          setExampleIndex((i) => (i + 1) % placeholderSuffixes.length);
        }
      }
      setTimeout(tick, 30);
    }
    tick();
    return () => abortController.abort();
  }, [exampleIndex]);
  return "I want to " + placeholderSuffixes[exampleIndex]!.slice(0, charIndex);
}
