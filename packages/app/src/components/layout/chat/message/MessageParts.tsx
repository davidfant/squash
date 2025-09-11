import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
} from "@/components/ai-elements/chain-of-thought";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrevious } from "@/hooks/usePrevious";
import type { AllTools, ChatMessage } from "@squash/api/agent/types";
import { useEffect, useMemo, useState } from "react";
import { Markdown } from "../../Markdown";
import { claudeCodeToolSteps } from "./tools/claude-code";
import {
  ToolChainOfThoughtStep,
  type ToolPart,
  type ToolStep,
} from "./tools/ToolChainOfThoughtStep";

interface TextBlock {
  type: "text";
  content: string;
}

interface ToolBlockItem<T extends keyof AllTools> {
  part: ToolPart<T>;
  step: ToolStep<AllTools, T>;
}

interface ToolBlock {
  type: "tools";
  tools: ToolBlockItem<keyof AllTools>[];
}

type GroupedPart = TextBlock | ToolBlock;

// Preprocessing function to group text and tool blocks
function preprocessMessageParts(parts: ChatMessage["parts"]): GroupedPart[] {
  const grouped: GroupedPart[] = [];
  let currentTools: ToolBlockItem<keyof AllTools>[] = [];

  for (const part of parts) {
    if (part.type === "text") {
      if (!!currentTools.length) {
        grouped.push({ type: "tools", tools: currentTools });
        currentTools = [];
      }

      grouped.push({ type: "text", content: part.text });
    } else if (part.type.startsWith("tool-")) {
      const toolName = part.type.slice("tool-".length);
      const step: ToolStep<AllTools, keyof AllTools> = {
        ...claudeCodeToolSteps,
      }[toolName as never] ?? {
        label: () => toolName,
        content: (part) => (
          <pre className="whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
            {JSON.stringify(part, null, 2)}
          </pre>
        ),
      };
      console.log("party", part, step);
      if (step) {
        currentTools.push({ part, step } as ToolBlockItem<keyof AllTools>);
      }
    }
  }

  if (!!currentTools.length) {
    grouped.push({ type: "tools", tools: currentTools });
  }

  return grouped;
}

function ChainOfThoughtBlock({
  streaming,
  tools,
}: {
  streaming: boolean;
  tools: ToolBlockItem<keyof AllTools>[];
}) {
  const [open, setOpen] = useState(streaming);
  const wasStreaming = usePrevious(streaming);
  useEffect(() => {
    if (wasStreaming && !streaming) {
      setOpen(false);
    }
  }, [streaming, wasStreaming]);

  return (
    <ChainOfThought open={open} onOpenChange={setOpen}>
      <ChainOfThoughtHeader>Working...</ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {tools.map((tool) => (
          <ToolChainOfThoughtStep
            key={tool.part.toolCallId}
            part={tool.part}
            step={tool.step}
          />
        ))}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}

export function MessageParts({
  parts,
  streaming,
}: {
  parts: ChatMessage["parts"];
  streaming: boolean;
}) {
  const groupedParts = useMemo(() => preprocessMessageParts(parts), [parts]);

  if (!groupedParts.length) {
    return <Skeleton className="h-4 w-48 mb-4" />;
  }

  return (
    <div className="space-y-5">
      {groupedParts.map((group, idx) => {
        if (group.type === "text") {
          return <Markdown key={`text-${idx}`}>{group.content}</Markdown>;
        }

        const isLastGroup = idx === groupedParts.length - 1;
        return (
          <ChainOfThoughtBlock
            key={`tools-${idx}`}
            streaming={streaming && isLastGroup}
            tools={group.tools}
          />
        );
      })}
    </div>
  );
}
