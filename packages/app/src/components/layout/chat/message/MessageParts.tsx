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
import type { AgentTools, ChatMessage } from "@hypershape-ai/api/agent/types";
import type { ToolUIPart } from "ai";
import { CheckCircle2Icon, CircleX, Eye, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Markdown } from "../../Markdown";

export type ToolPart<T extends keyof AgentTools> = ToolUIPart<{
  [K in T]: AgentTools[K];
}>;

const ToolAlert = ({
  icon,
  title,
  description,
  details,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  details?: ReactNode;
}) => {
  const alert = (
    <Alert>
      {icon}
      <AlertTitle>{title}</AlertTitle>
      {description && <AlertDescription>{description}</AlertDescription>}
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

function ReadFileToolAlert({ part }: { part: ToolPart<"readFile"> }) {
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
          title={`Failed reading ${part.input.path}`}
          description={part.errorText}
        />
      );
    case "input-streaming":
    case "input-available":
      return (
        <ToolAlert
          icon={<Loader2 className="animate-spin" />}
          title={`Reading ${part.input?.path ?? ""}`}
        />
      );
  }
}

function WriteFileToolAlert({ part }: { part: ToolPart<"writeFile"> }) {
  switch (part.state) {
    case "output-available":
      if (!part.output.success) {
        return (
          <ToolErrorAlert
            title={`Failed writing ${part.input.path}`}
            description={part.output.message}
          />
        );
      }
      return (
        <ToolAlert
          icon={<CheckCircle2Icon />}
          title={`Write ${part.input.path}`}
          description={part.input.explanation ?? part.input.instruction}
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
          title={`Failed writing ${part.input.path}`}
          description={part.errorText}
        />
      );
    case "input-streaming":
    case "input-available":
      return (
        <ToolAlert
          icon={<Loader2 className="animate-spin" />}
          title={`Writing ${part.input?.path ?? ""}`}
          description={part.input?.explanation ?? part.input?.instruction}
        />
      );
  }
}

export function MessageParts({ parts }: { parts: ChatMessage["parts"] }) {
  const renderedParts = parts
    .map((c, index) => {
      switch (c.type) {
        case "text":
          return <Markdown key={index}>{c.text}</Markdown>;
        case "tool-readFile":
          return <ReadFileToolAlert part={c} />;
        case "tool-writeFile":
          return <WriteFileToolAlert part={c} />;
        case "tool-deleteFile":
        case "tool-grepSearch":
        case "tool-todoWrite":
        case "tool-webSearch":
          return (
            <div key={index}>
              <pre>{JSON.stringify(c, null, 2)}</pre>
            </div>
          );

        case "step-start":
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
    <div className="space-y-2">{renderedParts}</div>
  ) : (
    <Skeleton className="h-4 w-48 mb-4" />
  );
}
