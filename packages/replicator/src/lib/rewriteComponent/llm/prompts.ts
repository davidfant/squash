import * as prettier from "@/lib/prettier";

export const instructions = `
You are a senior TypeScript developer. Your job is to create a React component in TypeScript. You will be given a minified JavaScript code snippet of the component, as well as one or more examples of how JSX is rendered to HTML.

Your task is to write a React component that maps the example input JSX to output HTML.

Guidelines when writing the component:
- Always start by importing React
- The component should be written in TypeScript
- Use JSX syntax instead of React.createElement whenever possible
- The implementation should be as minimal as possible while still mapping the JSX to the HTML
- You will be provided with a list of internally used components. These components are used by the component you are writing. You must figure out how to use these components as much as possible, so that we minimize reimplementation of the same logic. Make sure to import internally used components, don't redeclare them in the TypeScript.
- The minified JavaScript code can be used as inspiration, but you should not use it directly as there might be redundant code in the JavaScript.
- If instructed, give the component a descriptive name. Otherwise, just use the name of the component.

When writing the component you are only allowed to import from the following libraries:
- 'react'
- 'react-dom'
- \`import { cn } from "@/lib/utils"\`

You are NOT allowed to import any other libraries or dependencies. If the original code looks like it's using a library, you DONT have access to the library and must make a best effort guess to map the input JSX to output HTML.

Input format:
---
Component to rewrite: [component name]
Should rename component? [true/false]

# Code
\`\`\`javascript
[minified JavaScript code]
\`\`\`

# Internally used components
## InternalComponentName1
\`\`\`typescript
[internally used components]
\`\`\`

## InternalComponentName2
...

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
[reasoning about the component you will write, including how you will use the internal components]

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
  component: { name: { value: string; isFallback: boolean }; code: string },
  internalDeps: Array<{ name: string; module: string; code: string }>,
  examples: Array<{ jsx: string; html: string }>
) => {
  const unique = examples.filter(
    (ex, index, self) =>
      index === self.findIndex((t) => t.jsx === ex.jsx && t.html === ex.html)
  );

  const numExamples = Math.min(unique.length, 5);
  return [
    `Component to rewrite: ${component.name.value}`,
    `Should rename component? ${component.name.isFallback}`,
    "",
    "# Code",
    "```javascript",
    await prettier.js(`(${component.code})`),
    "```",
    "",
    "# Internally used components",
    ...internalDeps.flatMap((dep) => [
      `## \`import { ${dep.name} } from "${dep.module}"\``,
      "```typescript",
      dep.code,
      "```",
    ]),
    ...(!internalDeps.length ? ["No internally used components"] : []),
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

export const errorsUserMessage = async (
  errors: Array<{ message: string; description: string }>[],
  examples: Array<{ jsx: string; html: string }>
) => {
  return [
    `
Error: when rendering the component, the rendered HTML output of one or more of the examples does not match the expected HTML. Below you can see which examples succeeded and which failed. First, analyze the differences between the expected and actual HTML, and then identify what went wrong. Thereafter reason about potential ways of fixing it. If it's not possible to fix it, just say so. If you think you can fix it, implement the fix and provide an updated version of the component following the below format:

# ComponentName
\`\`\`typescript
[component code]
\`\`\`
`.trim(),
    ``,
    "# Examples",
    ...examples.flatMap((ex, index) => [
      `## Example ${index + 1}`,
      ...(errors[index]?.length
        ? [
            "Found errors while rendering the component",
            ...errors[index]!.flatMap((e) => [`- ${e.message}`, e.description]),
            "Input JSX",
            "```javascript",
            examples[index]?.jsx,
            "```",
          ]
        : ["Status: Success"]),
    ]),
  ].join("\n");
};
