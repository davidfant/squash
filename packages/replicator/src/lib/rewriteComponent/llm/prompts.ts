import * as prettier from "@/lib/prettier";

// - import { cn } from "@/lib/utils"
export const instructions = `
You are a senior TypeScript developer. Your job is to create a React component in TypeScript. You will be given a minified JavaScript code snippet of the component, as well as one or more examples of how JSX is rendered to HTML.

Your task is to write a React component that maps the example input JSX to output HTML.

Guidelines when writing the component:
- Always start by importing React
- The component should be written in TypeScript
- The implementation should be as minimal as possible while still mapping the JSX to the HTML
- The minified JavaScript code can be used as inspiration, but you should not use it directly as there might be redundant code in the JavaScript.
- Give the component a descriptive name

When writing the component you are only allowed to import from the following libraries:
- 'react'
- 'react-dom'

You are NOT allowed to import any other libraries or dependencies. If the original code looks like it's using a library, you DONT have access to the library and must make a best effort guess to map the input JSX to output HTML.

Input format:
---
# Code
\`\`\`javascript
[minified JavaScript code]
\`\`\`

# Examples
## Example 1
Input JSX
\`\`\`javascript
[input JSX]
\`\`\`

Output HTML
\`\`\`html
[output HTML]
\`\`\`

## Example 2
...
---

Output format:
[reasoning about the component you will write]

# ComponentName
\`\`\`typescript
[component code]
\`\`\`

Example output:
---
[reasoning about the component you will write]

# MyComponent
\`\`\`typescript
import React from "react";

interface Props {
  // ...
}

export function MyComponent({}: Props) {
  return <div />;
}
  \`\`\`
---
`.trim();

export const initialUserMessage = async (
  code: string,
  examples: Array<{ jsx: string; html: string }>
) => {
  const unique = examples.filter(
    (ex, index, self) =>
      index === self.findIndex((t) => t.jsx === ex.jsx && t.html === ex.html)
  );

  const numExamples = Math.min(unique.length, 5);
  return [
    "# Code",
    "```javascript",
    await prettier.js(`(${code})`),
    "```",
    "",
    "# Examples",
    `Showing ${numExamples} of ${unique.length} examples`,
    ...unique
      .slice(0, numExamples)
      .flatMap((instance, index) => [
        `## Example ${index + 1}`,
        "Input JSX",
        `\`\`\`javascript\n${instance.jsx}\`\`\``,
        "",
        "Output HTML",
        `\`\`\`html\n${instance.html}\`\`\``,
        "",
      ]),
  ].join("\n");
};

export const diffUserMessage = async (
  diffs: Array<string | null>,
  examples: Array<{ jsx: string; html: string }>
) => {
  return [
    `
Error: when rendering the component, the rendered HTML does not match the expected HTML. Below you can see which examples succeeded and which failed. First, identify what went wrong, and then think about how to fix it. If it's not possible to fix it, just say so. If you think you can fix it, provide the updated code following the same format as the original code:

# ComponentName
\`\`\`typescript
[component code]
\`\`\`
`.trim(),
    ``,
    "# Examples",
    ...examples.flatMap((ex, index) => [
      `## Example ${index + 1}`,
      ...(diffs[index] === null
        ? ["Status: Success"]
        : [
            "Status: Error",
            "```diff",
            diffs[index],
            "```",
            "Input JSX",
            "```javascript",
            examples[index]?.jsx,
            "```",
          ]),
    ]),
  ].join("\n");
};
