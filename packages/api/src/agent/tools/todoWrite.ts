import { tool } from "ai";
import { randomUUID } from "crypto";
import { z } from "zod";
import type { AgentRuntimeContext } from "../types";
import { zExplanation } from "./common";

const zTodo = z.object({
  content: z.string(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  id: z.string(),
  dependencies: z.array(z.string()),
});

export type Todo = z.infer<typeof zTodo>;

const defaultTodo: Todo = {
  id: "",
  content: "",
  status: "pending",
  dependencies: [],
};
const genId = () => randomUUID().split("-")[0]!;

export const todoWrite = (ctx: AgentRuntimeContext) =>
  tool({
    description: `
Use this tool to create and manage a structured task list for your current coding session. This helps track progress, organize complex tasks, and demonstrate thoroughness. Use these tools VERY frequently to ensure that you are tracking your tasks and giving the user visibility into your progress.

These tools are also EXTREMELY helpful for planning tasks, and for breaking down larger complex tasks into smaller steps. If you do not use this tool when planning, you may forget to do important tasks - and that is unacceptable.

### When to Use This Tool

Use proactively for:
1. Complex multi-step tasks (3+ distinct steps)
2. Non-trivial tasks requiring careful planning
3. User explicitly requests todo list
4. User provides multiple tasks (numbered/comma-separated)
5. After receiving new instructions - capture requirements as todos (use merge=false to add new ones)
6. After completing tasks - mark complete with merge=true and add follow-ups
7. When starting new tasks - mark as in_progress (ideally only one at a time)

### When NOT to Use

Skip for:
1. Single, straightforward tasks
2. Trivial tasks with no organizational benefit
3. Tasks completable in < 3 trivial steps
4. Purely conversational/informational requests
5. Don't add a task to test the change unless asked, or you'll overfocus on testing

### Examples

<example>
User: Add dark mode toggle to settings
Assistant: *Creates todo list:*
1. Add state management - no dependencies
2. Implement styles - depends on task 1
3. Create toggle component - depends on tasks 1, 2
4. Update components - depends on tasks 1, 2
<reasoning>
Multi-step feature with dependencies; user requested tests/build afterward.
</reasoning>
</example>

<example>
User: Rename getCwd to getCurrentWorkingDirectory across my project
Assistant: *Searches codebase, finds 15 instances across 8 files*
*Creates todo list with specific items for each file that needs updating*

<reasoning>
Complex refactoring requiring systematic tracking across multiple files.
</reasoning>
</example>

<example>
User: Implement user registration, product catalog, shopping cart, checkout flow.
Assistant: *Creates todo list breaking down each feature into specific tasks*

<reasoning>
Multiple complex features provided as list requiring organized task management.
</reasoning>
</example>

<example>
User: Optimize my React app - it's rendering slowly.
Assistant: *Analyzes codebase, identifies issues*
*Creates todo list: 1) Memoization, 2) Virtualization, 3) Image optimization, 4) Fix state loops, 5) Code splitting*

<reasoning>
Performance optimization requires multiple steps across different components.
</reasoning>
</example>

### Examples of When NOT to Use the Todo List

<example>
User: How do I print 'Hello World' in Python?
Assistant: \`\`\`python
print("Hello World")
\`\`\`

<reasoning>
Single trivial task completed in one step.
</reasoning>
</example>

<example>
User: What does git status do?
Assistant: Shows current state of working directory and staging area...

<reasoning>
Informational request with no coding task to complete.
</reasoning>
</example>

<example>
User: Add comment to calculateTotal function.
Assistant: *Uses edit tool to add comment*

<reasoning>
Single straightforward task in one location.
</reasoning>
</example>

<example>
User: Run npm install for me.
Assistant: *Executes npm install* Command completed successfully...

<reasoning>
Single command execution with immediate results.
</reasoning>
</example>

### Task States and Management

1. **Task States:**
- pending: Not yet started
- in_progress: Currently working on
- completed: Finished successfully
- cancelled: No longer needed

2. **Task Management:**
- Update status in real-time
- Mark complete IMMEDIATELY after finishing. It is critical that you mark todos as completed as soon as you are done with a task. Do not batch up multiple tasks before marking them as completed.
- Only ONE task in_progress at a time
- Complete current tasks before starting new ones

3. **Task Breakdown:**
- Create specific, actionable items
- Break complex tasks into manageable steps
- Use clear, descriptive names

4. **Task Dependencies:**
- Use dependencies field for natural prerequisites
- Avoid circular dependencies
- Independent tasks can run in parallel

When in doubt, use this tool. Proactive task management demonstrates attentiveness and ensures complete requirements.
`.trim(),
    inputSchema: z.object({
      merge: z
        .boolean()
        .describe(
          "Whether to merge the todos with the existing todos. If true, the todos will be merged into the existing todos based on the id field. You can leave unchanged properties undefined. If false, the new todos will replace the existing todos."
        ),
      todos: zTodo.partial().array(),
      explanation: zExplanation,
    }),
    outputSchema: z.object({ todos: zTodo.array() }),
    execute: async ({ merge, todos }) => {
      if (merge) {
        const existing = [...ctx.todos];
        const id2idx = new Map(existing.map((t, idx) => [t.id, idx]));

        todos
          .filter((t) => !!t.id && id2idx.has(t.id))
          .forEach((t) => {
            const idx = id2idx.get(t.id!)!;
            existing[idx] = { ...existing[idx]!, ...t, id: t.id! };
          });

        existing.push(
          ...todos
            .filter((t) => !t.id || !id2idx.has(t.id))
            .map((t) => ({ ...defaultTodo, id: genId(), ...t }))
        );
      } else {
        return { todos: todos.map((t) => ({ ...defaultTodo, ...t })) };
      }
    },
  });
