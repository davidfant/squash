import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AllTools, ChatMessage } from "@squash/api/agent/types";
import type { ToolUIPart } from "ai";
import { CheckCircle2Icon, CircleX, Eye, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Markdown } from "../../Markdown";

export type ToolPart<T extends keyof AllTools> = ToolUIPart<{
  [K in T]: AllTools[K];
}>;

const ToolAlert = ({
  icon,
  title,
  description,
  details,
  isLoading = false,
  showExpanded = false,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  details?: ReactNode;
  isLoading?: boolean;
  showExpanded?: boolean;
}) => {
  const alert = (
    <Alert
      className={cn(
        "transition-all duration-500 ease-out",
        isLoading
          ? "animate-gradient bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]"
          : ""
      )}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <AlertTitle className="transition-all duration-300 ease-in-out">
          {title}
          {/* Single line description - always show when not expanded */}
          {!showExpanded && description && (
            <>
              <span className="mx-2 opacity-60">•</span>
              <span className="font-normal text-muted-foreground">
                {description}
              </span>
            </>
          )}
        </AlertTitle>
        {/* Multi-line description - smooth height animation */}
        <div
          className={cn(
            "grid transition-all duration-500 ease-out",
            showExpanded && description
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <AlertDescription className="pt-1">{description}</AlertDescription>
          </div>
        </div>
      </div>
    </Alert>
  );

  if (!details) return alert;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-pointer">{alert}</div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {details}
      </DialogContent>
    </Dialog>
  );
};

const ToolErrorAlert = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => <ToolAlert icon={<CircleX />} title={title} description={description} />;

function ReadFileToolAlert({
  part,
  isLastTool,
}: {
  part: ToolPart<"readFile">;
  isLastTool: boolean;
}) {
  switch (part.state) {
    case "output-available":
      if (!part.output.success) {
        return (
          <ToolErrorAlert
            title={`Failed reading ${part.input.path}`}
            description={part.output.message}
          />
        );
      }
      return (
        <ToolAlert
          icon={<Eye />}
          title={`Read ${part.input.path}`}
          description={part.input.explanation}
          showExpanded={isLastTool}
          details={
            <pre className="whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
              {part.output.content}
            </pre>
          }
        />
      );
    case "output-error":
      return (
        <ToolErrorAlert
          title={`Failed reading ${part.input?.path ?? "file"}`}
          description={part.errorText}
        />
      );
    case "input-streaming":
    case "input-available":
      return (
        <ToolAlert
          icon={<Loader2 className="animate-spin" />}
          title={`Reading ${part.input?.path ?? ""}`}
          description={part.input?.explanation}
          isLoading={true}
          showExpanded={true}
        />
      );
  }
}

function WriteFileToolAlert({
  part,
  isLastTool,
}: {
  part: ToolPart<"writeFile">;
  isLastTool: boolean;
}) {
  switch (part.state) {
    case "output-available":
      return (
        <ToolAlert
          icon={<CheckCircle2Icon />}
          title={`Updated ${part.input.path}`}
          description={part.input.explanation ?? part.input.instruction}
          showExpanded={isLastTool}
          details={
            <pre className="whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
              {part.input.codeEdit}
            </pre>
          }
        />
      );
    case "output-error":
      return (
        <ToolErrorAlert
          title={`Failed updating ${part.input?.path ?? "file"}`}
          description={part.errorText}
        />
      );
    case "input-streaming":
    case "input-available":
      return (
        <ToolAlert
          icon={<Loader2 className="animate-spin" />}
          title={`Updating ${part.input?.path ?? ""}`}
          description={part.input?.explanation ?? part.input?.instruction}
          isLoading={true}
          showExpanded={true}
        />
      );
  }
}

export function MessageParts({ parts }: { parts: ChatMessage["parts"] }) {
  // Find the index of the last tool part
  const lastToolIndex = parts.reduce((lastIdx, part, idx) => {
    if (part.type.startsWith("tool-") && part.type !== "tool-todoWrite") {
      return idx;
    }
    return lastIdx;
  }, -1);

  const renderedParts = parts
    .map((c, index) => {
      const isLastTool = index === lastToolIndex;

      switch (c.type) {
        case "text":
          return <Markdown key={index}>{c.text}</Markdown>;
        case "tool-readFile":
          return (
            <ReadFileToolAlert key={index} part={c} isLastTool={isLastTool} />
          );
        case "tool-writeFile":
          return (
            <WriteFileToolAlert key={index} part={c} isLastTool={isLastTool} />
          );
        case "tool-deleteFile":
        case "tool-grepSearch":
        case "tool-webSearch":
          return (
            <div key={index}>
              <pre>{JSON.stringify(c, null, 2)}</pre>
            </div>
          );
        case "tool-todoWrite":
          return null;
        case "tool-gitCommit":
          return null;
        case "step-start":
        case "data-gitSha":
        case "file":
          return null;
        default:
          return (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{c.type}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre>{JSON.stringify(c, null, 2)}</pre>
              </CardContent>
            </Card>
          );
      }
    })
    .filter((p) => !!p);

  return renderedParts.length ? (
    <div className="space-y-5">{renderedParts}</div>
  ) : (
    <Skeleton className="h-4 w-48 mb-4" />
  );
}
