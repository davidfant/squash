import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@squashai/api/agent/types";
import {
  Check,
  EyeIcon,
  FilePenIcon,
  FolderSearch,
  ListTodoIcon,
  PlugIcon,
  SearchIcon,
  TerminalIcon,
  TriangleAlertIcon,
  UnplugIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Todo } from "../../TodoList";
import { FileBadge } from "../FileBadge";

interface TextBlock {
  type: "text";
  content: string;
  streaming: boolean;
}

export interface ReasoningBlock {
  type: "reasoning";
  summaries: Array<{ title: string; content: string }>;
  streaming: boolean;
}

interface AbortBlock {
  type: "abort";
}

interface GitCommitBlock {
  type: "commit";
  title: string;
  sha: string;
}

export interface ConnectToToolkitBlock {
  type: "connect-to-toolkit";
  redirectUrl: string;
  toolkit: { name: string; logoUrl: string };
}

interface LoadingBlock {
  type: "loading";
}

export interface EventBlockItem {
  icon: LucideIcon;
  loading: boolean;
  label: ReactNode;
}

interface EventBlock {
  type: "events";
  events: EventBlockItem[];
  streaming: boolean;
}

type Block =
  | TextBlock
  | ReasoningBlock
  | AbortBlock
  | ConnectToToolkitBlock
  | GitCommitBlock
  | EventBlock
  | LoadingBlock;

const isToolLoading = (state: `input-${string}` | `output-${string}`) =>
  state.startsWith("input-");

function safeJsonParse<T>(src: string): T | null {
  try {
    return JSON.parse(src) as T;
  } catch (error) {
    return null;
  }
}

function parseReasoningSummaries(src: string): ReasoningBlock["summaries"] {
  const headerRE = /\*\*(.*?)\*\*/g;
  const sections: ReasoningBlock["summaries"] = [];

  let currentTitle: string | null = null;
  let contentStart = 0;
  let m: RegExpExecArray | null;

  while ((m = headerRE.exec(src)) !== null) {
    if (currentTitle !== null) {
      const content = src.slice(contentStart, m.index).trim();
      sections.push({ title: currentTitle, content });
    }

    currentTitle = m[1]!.trim();
    contentStart = headerRE.lastIndex;
  }

  if (currentTitle !== null) {
    const content = src.slice(contentStart).trim();
    sections.push({ title: currentTitle, content });
  }

  return sections;
}

export function groupMessageEvents(
  parts: ChatMessage["parts"],
  streaming: boolean
): Block[] {
  const blocks: Block[] = [];
  let currentEvents: EventBlockItem[] = [];
  let todos: Todo[] = [];

  const flushEvents = (streaming: boolean = false) => {
    if (!!currentEvents.length) {
      blocks.push({
        type: "events",
        events: currentEvents,
        streaming,
      });
      currentEvents = [];
    }
  };

  for (const part of parts) {
    switch (part.type) {
      case "reasoning":
        flushEvents();
        const summaries = parseReasoningSummaries(part.text);
        blocks.push({
          type: "reasoning",
          summaries,
          streaming: parts.indexOf(part) === parts.length - 1,
        });
        break;
      case "text":
        if (part.text.trim()) {
          flushEvents();
          blocks.push({
            type: "text",
            content: part.text,
            streaming: part.state === "streaming",
          });
        }
        break;
      case "tool-AnalyzeScreenshot": {
        flushEvents();
        blocks.push({
          type: "text",
          content: "Finished analyzing the screenshot...",
          streaming: false,
        });
        break;
      }
      case "tool-ClaudeCode__Read": {
        const path = part.input?.file_path;
        currentEvents.push({
          icon: EyeIcon,
          loading: isToolLoading(part.state),
          label: (
            <>
              <span>Read</span>
              {path && <FileBadge path={path} />}
            </>
          ),
        });
        break;
      }
      case "tool-ClaudeCode__Edit":
      case "tool-ClaudeCode__MultiEdit":
      case "tool-ClaudeCode__Write": {
        const path = part.input?.file_path;
        currentEvents.push({
          icon: FilePenIcon,
          loading: part.state.startsWith("input-"),
          label: (
            <>
              <span>Edit</span>
              {path && <FileBadge path={path} />}
            </>
          ),
        });
        break;
      }
      case "tool-ClaudeCode__Bash": {
        currentEvents.push({
          icon: TerminalIcon,
          loading: isToolLoading(part.state),
          label:
            part.input?.description ??
            (!!part.input?.command && (
              <Badge
                variant="outline"
                className="border-none bg-muted max-w-10"
              >
                {part.input?.command}
              </Badge>
            )),
        });
        break;
      }
      case "tool-ClaudeCode__TodoWrite": {
        if (part.state === "output-available") {
          const nextTodos = part.input.todos.map((t) => ({
            id: t.content,
            content: t.status === "in_progress" ? t.activeForm : t.content,
            status: t.status,
          }));

          const prevStatus = new Map<string, Todo["status"]>(
            todos.map((t) => [t.id, t.status])
          );

          const completed = nextTodos.filter(
            (t) =>
              t.status === "completed" && prevStatus.get(t.id) !== "completed"
          );
          // const inProgress = nextTodos.filter(
          //   (t) =>
          //     t.status === "in_progress" &&
          //     prevStatus.get(t.id) !== "in_progress"
          // );
          // const added = nextTodos.filter((t) => !prevStatus.has(t.id));

          currentEvents.push(
            ...completed.map((t) => ({
              icon: Check,
              loading: isToolLoading(part.state),
              label: `Completed '${t.content}'`,
            }))
          );
          // currentEvents.push(
          //   ...inProgress.map((t) => ({ icon: CircleDot, label: t.content }))
          // );
          // currentEvents.push(
          //   ...added.map((t) => ({ icon: CircleDashed, label: t.content }))
          // );

          todos = nextTodos;
        }
        break;
      }
      case "tool-ClaudeCode__Glob": {
        currentEvents.push({
          icon: FolderSearch,
          loading: isToolLoading(part.state),
          label: (
            <>
              <span>
                {part.state === "output-available"
                  ? "Scanned files for"
                  : "Scanning files for"}
              </span>
              {!!part.input?.pattern && (
                <Badge variant="outline" className="border-none bg-muted">
                  {part.input?.pattern}
                </Badge>
              )}
            </>
          ),
        });
      }
      case "tool-ClaudeCode__Grep": {
        currentEvents.push({
          icon: SearchIcon,
          loading: isToolLoading(part.state),
          label: (
            <>
              <span>Search for</span>
              {!!part.input?.pattern && (
                <Badge variant="outline" className="border-none bg-muted">
                  {part.input?.pattern}
                </Badge>
              )}
            </>
          ),
        });
        break;
      }
      case "tool-ClaudeCode__Task": {
        currentEvents.push({
          icon: ListTodoIcon,
          loading: false, // isToolLoading(part.state),
          label: part.input?.description,
        });
        break;
      }
      case "tool-ClaudeCode__mcp__Composio__SearchTools":
      case "tool-ClaudeCode__mcp__Composio__SearchToolkits": {
        currentEvents.push({
          icon: SearchIcon,
          loading: isToolLoading(part.state),
          label: (
            <>
              <span>Search for</span>
              {!!part.input?.keywords && (
                <Badge variant="outline" className="border-none bg-muted">
                  {part.input?.keywords}
                </Badge>
              )}
            </>
          ),
        });
        break;
      }
      case "tool-ClaudeCode__mcp__Composio__ListConnectedToolkits": {
        currentEvents.push({
          icon: PlugIcon,
          loading: isToolLoading(part.state),
          label: "List connected toolkits",
        });
        break;
      }
      case "tool-ClaudeCode__mcp__Composio__CheckConnectionStatus": {
        currentEvents.push({
          icon: UnplugIcon,
          loading: isToolLoading(part.state),
          label: "Check connection status",
        });
        break;
      }
      case "tool-ClaudeCode__mcp__Composio__MultiExecuteTool": {
        part.input?.toolCalls
          ?.filter((tc) => !!tc)
          .map((tc) =>
            currentEvents.push({
              icon: ZapIcon,
              loading: isToolLoading(part.state),
              label: tc!.reason,
            })
          );
        break;
      }
      case "tool-ClaudeCode__mcp__Composio__ConnectToToolkit": {
        if (part.state === "output-available") {
          const connectData = safeJsonParse<{
            redirectUrl: string;
            connectRequestId: string;
            toolkit: { name: string; logoUrl: string };
          }>(part.output);

          if (connectData) {
            const waitForConnectionPart = parts
              .filter(
                (p) =>
                  p.type === "tool-ClaudeCode__mcp__Composio__WaitForConnection"
              )
              .find(
                (p) =>
                  p.input?.connectRequestId === connectData.connectRequestId
              );
            if (waitForConnectionPart?.output) {
            } else {
              flushEvents();
              blocks.push({
                type: "connect-to-toolkit",
                redirectUrl: connectData.redirectUrl,
                toolkit: connectData.toolkit,
              });
            }
          } else {
            currentEvents.push({
              icon: TriangleAlertIcon,
              loading: false,
              label: "Failed to connect to toolkit",
            });
          }
        }
        break;
      }
      case "tool-ClaudeCode__mcp__Composio__GetConnectedTools":
      case "tool-ClaudeCode__mcp__Composio__WaitForConnection":
        break;
      case "tool-GitCommit": {
        if (part.state === "output-available") {
          flushEvents();
          blocks.push({
            type: "commit",
            title: part.input.title,
            sha: part.output.sha,
          });
        }
        break;
      }
      case "data-AbortRequest": {
        flushEvents();
        blocks.push({ type: "abort" });
        break;
      }
      default: {
        if (part.type.startsWith("tool-")) {
          console.warn(`Unknown tool:`, part);
        }
      }
    }
  }

  flushEvents(true);

  const last = blocks[blocks.length - 1];
  if (streaming) {
    if (!last) {
      blocks.push({ type: "loading" });
    } else if (
      last?.type === "events" &&
      !last.events.some((ev) => ev.loading)
    ) {
      blocks.push({ type: "loading" });
    } else if (last?.type === "text" && !last.streaming) {
      blocks.push({ type: "loading" });
    }
  }

  return blocks;
}
