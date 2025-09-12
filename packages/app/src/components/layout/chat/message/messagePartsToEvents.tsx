import type { ChatMessage } from "@squash/api/agent/types";
import type { ChatStatus } from "ai";
import {
  CircleCheck,
  EyeIcon,
  FilePenIcon,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Todo } from "../TodoList";
import { FileBadge } from "./FileBadge";

interface TextBlock {
  type: "text";
  content: string;
}

export interface EventBlockItem {
  icon: LucideIcon;
  label: ReactNode;
}

interface EventBlock {
  type: "events";
  events: EventBlockItem[];
  streaming: boolean;
}

type Block = TextBlock | EventBlock;

export function messagePartsToEvents(
  parts: ChatMessage["parts"],
  status: ChatStatus
): Block[] {
  const blocks: Block[] = [];
  let currentEvents: EventBlockItem[] = [];
  let todos: Todo[] = [];

  for (const part of parts) {
    switch (part.type) {
      case "text":
        if (!!currentEvents.length) {
          blocks.push({
            type: "events",
            events: currentEvents,
            streaming: false,
          });
          currentEvents = [];
        }

        blocks.push({ type: "text", content: part.text });
        break;
      case "tool-ClaudeCodeRead": {
        const path = part.input?.file_path;
        currentEvents.push({
          icon: EyeIcon,
          label: (
            <div className="inline-flex items-center gap-1">
              {part.state === "output-available" ? "Read" : "Reading"}
              {path && <FileBadge path={path} />}
            </div>
          ),
        });
        break;
      }
      case "tool-ClaudeCodeEdit": {
        const path = part.input?.file_path;
        currentEvents.push({
          icon: FilePenIcon,
          label: (
            <div className="inline-flex items-center gap-1">
              {part.state === "output-available" ? "Updated" : "Updating"}
              {path && <FileBadge path={path} />}
            </div>
          ),
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
            ...completed.map((t) => ({ icon: CircleCheck, label: t.content }))
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
      default: {
        console.warn(`Unknown tool:`, part);
      }
    }
  }

  if (!!currentEvents.length) {
    blocks.push({
      type: "events",
      events: currentEvents,
      streaming: status === "streaming",
    });
  }

  return blocks;
}
