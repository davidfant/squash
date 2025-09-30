import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@squashai/api/agent/types";
import {
  Check,
  EyeIcon,
  FilePenIcon,
  FolderSearch,
  SearchIcon,
  TerminalIcon,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Todo } from "../../TodoList";
import { FileBadge } from "../FileBadge";

interface TextBlock {
  type: "text";
  content: string;
}

interface AbortBlock {
  type: "abort";
}

interface GitCommitBlock {
  type: "commit";
  title: string;
  sha: string;
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
  | AbortBlock
  | GitCommitBlock
  | EventBlock
  | LoadingBlock;

const isToolLoading = (state: `input-${string}` | `output-${string}`) =>
  state.startsWith("input-");

export function groupMessageEvents(parts: ChatMessage["parts"]): Block[] {
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
      case "text":
        flushEvents();
        blocks.push({ type: "text", content: part.text });
        break;
      case "tool-ClaudeCodeRead": {
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
      case "tool-ClaudeCodeEdit":
      case "tool-ClaudeCodeMultiEdit":
      case "tool-ClaudeCodeWrite": {
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
      case "tool-ClaudeCodeBash": {
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
      case "tool-ClaudeCodeTodoWrite": {
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
      case "tool-ClaudeCodeGlob": {
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
      case "tool-ClaudeCodeGrep": {
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

  const lastBlock = blocks[blocks.length - 1];
  if (
    !lastBlock ||
    (lastBlock.type === "events" &&
      !lastBlock.events.some((event) => event.loading))
  ) {
    blocks.push({ type: "loading" });
  }

  return blocks;
}
