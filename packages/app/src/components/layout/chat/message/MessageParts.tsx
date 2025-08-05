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
import type { AgentTools, ChatMessage } from "@hypershape-ai/api/agent/types";
import type { ToolUIPart } from "ai";
import { CheckCircle2Icon, CircleX, Eye, GitCommit, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Markdown } from "../../Markdown";

export type ToolPart<T extends keyof AgentTools> = ToolUIPart<{
  [K in T]: AgentTools[K];
}>;

//  ToDo: Where should we define this? Seems odd to put it here. Should this be in createAgentTools? 
type GitCommitPart = ToolUIPart<{
  gitCommit: {
    input: { title: string; body: string };
    output: { commitSha: string };
  };
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

function GitCommitToolAlert({ part }: { part: GitCommitPart }) {
  switch (part.state) {
    case "output-available":
      return (
        <ToolAlert
          icon={<GitCommit />}
          title="Git Commit"
          description={`Created commit ${part.output.commitSha.slice(0, 7)}`}
          details={
            <div className="space-y-2">
              <div>
                <span className="font-semibold">Title:</span>
                <p className="mt-1">{part.input.title}</p>
              </div>
              {part.input.body && (
                <div>
                  <span className="font-semibold">Body:</span>
                  <p className="mt-1 whitespace-pre-wrap">{part.input.body}</p>
                </div>
              )}
              <div>
                <span className="font-semibold">Commit SHA:</span>
                <p className="mt-1 font-mono text-sm">{part.output.commitSha}</p>
              </div>
            </div>
          }
        />
      );
    case "output-error":
      return (
        <ToolAlert
          icon={<CircleX />}
          title="Git Commit Error"
          description="Failed to create git commit"
          details={
            <pre className="whitespace-pre-wrap max-h-[60vh] overflow-y-auto text-destructive">
              {part.errorText}
            </pre>
          }
        />
      );
    case "input-streaming":
    case "input-available":
      return (
        <ToolAlert
          icon={<Loader2 className="animate-spin" />}
          title="Creating git commit..."
          description={part.input?.title}
        />
      );
  }
}

export function MessageParts({ parts, indent = false }: { parts: ChatMessage["parts"]; indent?: boolean }) {
  const renderedParts = parts
    .map((c, index) => {
      switch (c.type) {
        case "text":
          return <Markdown key={index}>{c.text}</Markdown>;
        case "tool-readFile":
          return <ReadFileToolAlert key={index} part={c} />;
        case "tool-writeFile":
          return <WriteFileToolAlert key={index} part={c} />;
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
          if ((c as any).type === "tool-gitCommit") {
            return <GitCommitToolAlert key={index} part={c as unknown as GitCommitPart} />;
          }
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
    <div className={cn("space-y-3", indent && "pl-7")}>{renderedParts}</div>
  ) : (
    <Skeleton className={cn("h-4 w-48 mb-4", indent && "ml-7")} />
  );
}
