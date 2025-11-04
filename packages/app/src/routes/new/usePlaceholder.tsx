import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const placeholderSuffixes = [
  "Help me connect [[https://logos.composio.dev/api/facebook]] Facebook ads with [[https://logos.composio.dev/api/posthog]] PostHog",
  "I want to transcribe [[https://logos.composio.dev/api/salesforce]] Salesforce calls using [[https://logos.composio.dev/api/openai]] OpenAI",
] as const;

/**
 * Parse a suffix into an array whose *elements* are either
 * ▸ a single‑character <span>, or
 * ▸ a <img> representing the logo URL in [[double‑brackets]].
 *
 * This gives us a stable list that can be indexed character‑by‑character
 * *including* the logos.
 */
function parseSuffix(suffix: string): ReactNode[] {
  const nodes: ReactNode[] = [];

  suffix.split(/(\[\[https?:\/\/[^\]]+\]\])/).forEach((part) => {
    const match = part.match(/^\[\[(https?:\/\/[^\]]+)\]\]$/);
    const src = match?.[1];

    if (src) {
      // A logo counts as ONE "character" in the typewriter
      nodes.push(
        <img src={src} className="size-5 inline align-baseline -mb-1 ml-1" />
      );
    } else {
      nodes.push(...part.split(""));
    }
  });

  return nodes;
}

/** All suffixes pre‑tokenised once on module load */
const suffixNodes = placeholderSuffixes.map(parseSuffix);

export function usePlaceholder() {
  const [exampleIndex, setExampleIndex] = useState(0); // which suffix are we on?
  const [charIndex, setCharIndex] = useState(0); // which "unit" is visible?

  /* ───────── typewriter logic ───────── */
  useEffect(() => {
    let index = 0;
    let incrementing = true;
    const abort = new AbortController();

    const nodes = suffixNodes[exampleIndex]!; // active list of spans + imgs

    async function tick() {
      if (abort.signal.aborted) return;

      if (incrementing) {
        index++;
        setCharIndex(index);
        if (index === nodes.length) {
          incrementing = false;
          await new Promise((r) => setTimeout(r, 1000)); // pause at full text
        }
      } else {
        index--;
        setCharIndex(index);
        if (index === 0) {
          incrementing = true;
          await new Promise((r) => setTimeout(r, 500)); // pause at empty
          setExampleIndex((i) => (i + 1) % suffixNodes.length); // next suffix
        }
      }

      setTimeout(tick, 30); // 30 ms between updates – adjust to taste
    }

    tick();
    return () => abort.abort();
  }, [exampleIndex]);

  /* ───────── slice out what should be visible ───────── */
  const display = useMemo(
    () =>
      suffixNodes[exampleIndex]!.map((node, index) => (
        <span
          key={index}
          className={cn(
            "transition-opacity duration-500 whitespace-pre shrink-0",
            index < charIndex ? "opacity-100" : "opacity-0"
          )}
        >
          {node}
        </span>
      )),
    [exampleIndex, charIndex]
  );

  // Ready to be dropped straight into a placeholder attribute
  return <>{display}</>;
}
