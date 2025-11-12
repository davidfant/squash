import { FadingScrollView } from "@/components/blocks/fading-scroll-view";
import { Item } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import startCase from "lodash.startcase";
import { CheckCircle2, ChevronRight, XCircle } from "lucide-react";
import { useState, type ReactNode } from "react";

export type LogItemStatus = "input" | "output" | "error";

export function ToolCallLogItemHeader({ tool }: { tool: string }) {
  const { theme } = useTheme();
  const toolkitName = startCase(tool.split("_")[0]?.toLowerCase());
  const logoUrl = `https://static.squash.build/logos/${theme}/${toolkitName}`;
  const toolName = startCase(tool.split("_").slice(1).join("_").toLowerCase());
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <img src={logoUrl} alt={toolkitName} className="size-3" />
        {toolkitName}
      </div>
      <p className="text-sm truncate">{toolName}</p>
    </div>
  );
}

export function AIGatewayLogItemHeader({
  model,
  label,
}: {
  model: { provider: string | null; id: string };
  label: string;
}) {
  const { theme } = useTheme();
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {!!model.provider && (
          <img
            src={
              {
                openai: `https://static.squash.build/logos/${theme}/openai`,
                google: `https://static.squash.build/logos/${theme}/googlesuper`,
                anthropic: `https://static.squash.build/logos/${theme}/claude`,
              }[model.provider.split(".")[0]!.toLocaleLowerCase()]
            }
            alt={model.provider}
            className="size-3"
          />
        )}
        {model.id}
      </div>
      <p className="text-sm truncate">{label}</p>
    </div>
  );
}

interface ConsoleLogItemDetailsProps {
  input: unknown;
  output?: unknown;
  error?: string;
  status: LogItemStatus;
}

export const ConsoleLogItemDetails = ({
  input,
  output,
  error,
  status,
}: ConsoleLogItemDetailsProps) => (
  <div className="space-y-3">
    <div className="space-y-1">
      <Label className="text-muted-foreground">Input</Label>
      <FadingScrollView className="max-h-48 scrollbar-hidden">
        {typeof input === "string" ? (
          <p className="text-sm">{input}</p>
        ) : (
          <pre className="text-xs bg-muted rounded-md p-2 overflow-x-auto">
            {JSON.stringify(input, null, 2)}
          </pre>
        )}
      </FadingScrollView>
    </div>

    {/* Output or Error */}
    {status === "output" && output !== undefined && (
      <div className="space-y-1">
        <Label className="text-muted-foreground">Output</Label>
        <FadingScrollView className="max-h-48 scrollbar-hidden">
          {typeof output === "string" ? (
            <p className="text-sm">{output}</p>
          ) : (
            <pre className="text-xs bg-muted rounded-md p-2 overflow-x-auto">
              {JSON.stringify(output, null, 2)}
            </pre>
          )}
        </FadingScrollView>
      </div>
    )}

    {status === "error" && error && (
      <div className="space-y-1">
        <Label className="text-muted-foreground">Error</Label>
        <div className="text-xs bg-muted rounded p-2">{error}</div>
      </div>
    )}
  </div>
);

export function ConsoleLogItem({
  title,
  details,
  status,
}: {
  title: ReactNode;
  details: ReactNode;
  status: LogItemStatus;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = { input: Spinner, output: CheckCircle2, error: XCircle }[status];

  return (
    <Item
      variant="outline"
      className="min-w-0 block self-start py-2 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex gap-2 w-full items-center">
        {title}
        <Icon className="shrink-0 size-4" />
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
            className="overflow-hidden pt-1"
          >
            {details}
          </motion.div>
        )}
      </AnimatePresence>
    </Item>
  );
}
