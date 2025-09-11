import {
  Activity,
  CheckSquare,
  Edit3,
  Eye,
  EyeIcon,
  FileSearch,
  FileText,
  FolderSearch,
  Globe,
  ListCheckIcon,
  NotebookPen,
  Search,
  Square,
  SquarePenIcon,
  Target,
  Terminal,
  Wrench,
} from "lucide-react";
import type { ClaudeCodeAgentTools } from "node_modules/@squash/api/dist/agent/claudeCode/tools";
import { TodoList } from "../../TodoList";
import type { ToolSteps } from "./ToolChainOfThoughtStep";

export const claudeCodeToolSteps: ToolSteps<ClaudeCodeAgentTools> = {
  ClaudeCodeRead: {
    icon: () => EyeIcon,
    label: (p) => {
      const name = p.input?.file_path?.split("/").pop();
      if (p.state === "output-available") return `Read ${name}`;
      return `Reading ${name ?? ""}`;
    },
  },
  ClaudeCodeEdit: {
    icon: () => SquarePenIcon,
    label: (p) => {
      const name = p.input?.file_path?.split("/").pop();
      if (p.state === "output-available") return `Updated ${name}`;
      return `Updating ${name ?? ""}`;
    },
  },
  ClaudeCodeTodoWrite: {
    icon: () => ListCheckIcon,
    label: (p) => {
      if (p.state === "output-available") return `Updated todos`;
      return `Updating todos`;
    },
    content: (p) => (
      <TodoList
        todos={(p.input?.todos ?? [])
          .map((t) => {
            const status = t?.status;
            const content =
              t?.status === "in_progress" ? t.activeForm : t?.content;
            if (!status || !content) return undefined;
            return { status, content };
          })
          .filter((t) => !!t)}
      />
    ),
  },
};

// Tool configuration mapping
export const CLAUDE_CODE_TOOL_CONFIG = {
  "tool-claudecode-Task": {
    icon: Target,
    getLabel: (state: string) =>
      state === "output-available" ? "Task completed" : "Launching task",
  },
  "tool-claudecode-Bash": {
    icon: Terminal,
    getLabel: (state: string) =>
      state === "output-available" ? "Command executed" : "Running command",
  },
  "tool-claudecode-Glob": {
    icon: FolderSearch,
    getLabel: (state: string) =>
      state === "output-available" ? "Files found" : "Finding files",
  },
  "tool-claudecode-Grep": {
    icon: Search,
    getLabel: (state: string) =>
      state === "output-available" ? "Search completed" : "Searching content",
  },
  "tool-claudecode-ExitPlanMode": {
    icon: CheckSquare,
    getLabel: (state: string) =>
      state === "output-available" ? "Plan ready" : "Creating plan",
  },
  "tool-claudecode-Read": {
    icon: Eye,
    getLabel: (state: string) =>
      state === "output-available" ? "File read" : "Reading file",
  },
  "tool-claudecode-Edit": {
    icon: Edit3,
    getLabel: (state: string) =>
      state === "output-available" ? "File edited" : "Editing file",
  },
  "tool-claudecode-MultiEdit": {
    icon: Wrench,
    getLabel: (state: string) =>
      state === "output-available" ? "Edits applied" : "Applying edits",
  },
  "tool-claudecode-Write": {
    icon: FileText,
    getLabel: (state: string) =>
      state === "output-available" ? "File written" : "Writing file",
  },
  "tool-claudecode-NotebookEdit": {
    icon: NotebookPen,
    getLabel: (state: string) =>
      state === "output-available" ? "Notebook updated" : "Editing notebook",
  },
  "tool-claudecode-WebFetch": {
    icon: Globe,
    getLabel: (state: string) =>
      state === "output-available" ? "Content fetched" : "Fetching webpage",
  },
  "tool-claudecode-TodoWrite": {
    icon: CheckSquare,
    getLabel: (state: string) =>
      state === "output-available" ? "Todos updated" : "Updating todos",
  },
  "tool-claudecode-WebSearch": {
    icon: FileSearch,
    getLabel: (state: string) =>
      state === "output-available" ? "Search completed" : "Searching web",
  },
  "tool-claudecode-BashOutput": {
    icon: Activity,
    getLabel: (state: string) =>
      state === "output-available" ? "Output retrieved" : "Getting output",
  },
  "tool-claudecode-KillBash": {
    icon: Square,
    getLabel: (state: string) =>
      state === "output-available" ? "Shell stopped" : "Stopping shell",
  },
} as const;

export type ClaudeCodeToolType = keyof typeof CLAUDE_CODE_TOOL_CONFIG;
