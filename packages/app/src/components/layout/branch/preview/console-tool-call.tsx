import { FadingScrollView } from "@/components/blocks/fading-scroll-view";
import { Badge } from "@/components/ui/badge";
import { Item } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import startCase from "lodash.startcase";
import { CheckCircle2, ChevronRight, XCircle } from "lucide-react";
import { useState } from "react";

export interface ToolCall {
  id: string;
  tool: string;
  input: unknown;
  output: unknown;
  error: string | undefined;
  state: "input" | "output" | "error";
}

export function ToolCallItem({ toolCall }: { toolCall: ToolCall }) {
  const toolkitName = startCase(toolCall.tool.split("_")[0]?.toLowerCase());
  const logoUrl = `https://logos.composio.dev/api/${toolkitName}`;
  const toolName = startCase(
    toolCall.tool.split("_").slice(1).join("_").toLowerCase()
  );
  const [isOpen, setIsOpen] = useState(false);

  const StatusIcon = {
    input: Spinner,
    output: CheckCircle2,
    error: XCircle,
  }[toolCall.state];

  return (
    <Item
      variant="outline"
      className="min-w-0 block self-start py-2 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex gap-3 w-full items-center">
        <div className="flex-1">
          <Badge variant="outline">
            <img src={logoUrl} alt={toolkitName} className="size-4" />
            {toolkitName}
          </Badge>
          <p className={cn("text-sm", !isOpen && "truncate")}>{toolName}</p>
        </div>
        <StatusIcon className="shrink-0 size-4" />
        <ChevronRight
          className={cn(
            "shrink-0 size-4 transition-transform duration-200",
            isOpen && "rotate-90"
          )}
        />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Input</Label>
                <FadingScrollView className="max-h-48 scrollbar-hidden">
                  <pre className="text-xs bg-muted rounded-md p-2 overflow-x-auto">
                    {JSON.stringify(toolCall.input, null, 2)}
                  </pre>
                </FadingScrollView>
              </div>

              {/* Output or Error */}
              {toolCall.state === "output" && toolCall.output !== undefined && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Output</Label>
                  <FadingScrollView className="max-h-48 scrollbar-hidden">
                    <pre className="text-xs bg-muted rounded-md p-2 overflow-x-auto">
                      {JSON.stringify(toolCall.output, null, 2)}
                    </pre>
                  </FadingScrollView>
                </div>
              )}

              {toolCall.state === "error" && toolCall.error && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Error</Label>
                  <div className="text-xs bg-muted rounded p-2">
                    {toolCall.error}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Item>
  );
}
