import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, CircleDot, CircleX } from "lucide-react";

export interface Todo {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
}

interface TodoListProps {
  todos: Todo[];
}

export function TodoList({ todos }: TodoListProps) {
  if (!todos.length) return null;

  return (
    <div className="space-y-1">
      {todos.map((todo, index) => {
        const Icon = {
          completed: CheckCircle2,
          in_progress: CircleDot,
          pending: Circle,
          cancelled: CircleX,
        }[todo.status];
        return (
          <div
            key={index}
            className={cn(
              "flex items-start gap-2 text-sm",
              todo.status === "completed" && "opacity-50"
            )}
          >
            <Icon
              className={cn(
                "size-4 text-muted-foreground flex-shrink-0 mt-0.25",
                todo.status === "completed" && "text-green-600",
                todo.status === "in_progress" && "animate-spin"
              )}
            />
            <span className={cn(todo.status === "completed" && "line-through")}>
              {todo.content}
            </span>
          </div>
        );
      })}
    </div>
  );
}
