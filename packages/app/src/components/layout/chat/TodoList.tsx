import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

interface Todo {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  dependencies: string[];
}

interface TodoListProps {
  todos: Todo[];
}

export function TodoList({ todos }: TodoListProps) {
  if (!todos.length) return null;

  return (
    <div className="px-4 pb-2">
      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Tasks</h3>
        <div className="space-y-1">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className={cn(
                "flex items-start gap-2 text-sm",
                todo.status === "completed" && "opacity-60"
              )}
            >
              {todo.status === "completed" ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              )}
              <span
                className={cn(
                  todo.status === "completed" && "line-through",
                  todo.status === "in_progress" && "font-medium"
                )}
              >
                {todo.content}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 