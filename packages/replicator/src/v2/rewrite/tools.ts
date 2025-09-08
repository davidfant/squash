import { tool } from "ai";
import z from "zod";
import { llmMerge } from "./llmMerge";

export function createReplicatorTools() {
  let latestCode: string | undefined;

  const EditComponent = tool({
    description: `
  Use this tool to propose an edit to the component. The code edit will be read by a less intelligent model, which will quickly apply the edit. You should make it clear what the edit is, while also minimizing the unchanged code you write.
  
  This will be read by a less intelligent model, which will quickly apply the edit. When writing the edit, you should specify each edit in sequence with 2-3 lines of unchanged code above and below the edit, and with the comments like \`// ... existing code ...\` to represent unchanged code before, after, and in between edited lines.
  
  For example:
  \`\`\`
  // ... keep all code until myFunction ...
  [first edit, including context lines above and below]
  // ... keep the rest of myFunction ...
  [second edit, including context lines above and below]
  // ... rest of the file ...
  \`\`\`
  
  You should still bias towards repeating as few lines of the original file as possible to convey the change. But, each edit should contain sufficient context of unchanged lines around the code you're editing to resolve ambiguity, as well as comments like \`// ... existing code ...\` for the existing code.
  
  DO NOT omit spans of pre-existing code (or comments) without using the \`// ... existing code ...\` comment to indicate the omission. If you omit the existing code comment, the model may inadvertently delete these lines.
  
  Make sure it is clear what the edit should be, and where it should be applied. To create a new file, simply specify the content of the file in the \`codeEdit\` field.
  
  If you plan on deleting a section, you must provide the context to delete it. Some options:
  1. If the initial code is \`\`\`code \\n Block 1 \\n Block 2 \\n Block 3 \\n code\`\`\`, and you want to remove Block 2, you would output \`\`\`// ... keep existing code ... \\n Block 1 \\n  Block 3 \\n // ... rest of code ...\`\`\`.
  2. If the initial code is \`\`\`code \\n Block \\n code\`\`\`, and you want to remove Block, you can also specify \`\`\`// ... keep existing code ... \\n // remove Block \\n // ... rest of code ...\`\`\`.
  `.trim(),
    inputSchema: z.object({
      instructions: z
        .string()
        .describe(
          "A single sentence instruction describing what you are going to do for the sketched edit. This is used to assist the less intelligent model in applying the edit. Please use the first person to describe what you are going to do. Don't repeat what you have said previously in normal messages. And use it to disambiguate uncertainty in the edit."
        ),
      codeEdit: z
        .string()
        .describe(
          "Specify ONLY the precise lines of code that you wish to edit AND 2-3 lines of unchanged code above and below the edit AND comments like `// ... keep existing code ...` for existing unchanged code. Unless you are changing the beginning of the file, **ALWAYS** start with a comment like `// ... keep existing code ...` to indicate the unchanged code before the edit. **AVOID writing out unchanged code unless it is 2-3 lines above and below the edit, or it is necessary to provide context for the edit**. Instead, represent all unchanged code using the comment of the language you're editing in - example: `// ... existing code ...`"
        ),
      componentName: z.string(),
      componentDescription: z.string(),
    }),
    execute: async (input) => {
      if (!latestCode) {
        latestCode = input.codeEdit;
      } else {
        latestCode = await llmMerge({
          instructions: input.instructions,
          original: latestCode,
          update: input.codeEdit,
          apiKey: process.env.MORPH_API_KEY!,
        });
      }
      const component = {
        name: input.componentName,
        description: input.componentDescription,
      };
      return { ok: true, component, code: latestCode! } as const;
    },
  });

  const MarkTestsAsInvalid = tool({
    description: `
Use this tool to tell the evaluation harness that one or more test cases are invalid, for example because the test case cannot be satisfied in a static-render environment or are internally contradictory. The harness will drop those tests from future diff checks.

When to use:
1. The mismatch is due to effects / layout / browser APIs that do not run under \`renderToStaticMarkup\` (e.g. ResizeObserver, useLayoutEffect).
2. The test's expected HTML conflicts with other tests or is malformed.
      `.trim(),
    inputSchema: z.object({
      reason: z.string(),
      ids: z.string().array().nonempty(),
    }),
    execute: () => ({ ok: true }),
  });

  return { MarkTestsAsInvalid, EditComponent };
}
