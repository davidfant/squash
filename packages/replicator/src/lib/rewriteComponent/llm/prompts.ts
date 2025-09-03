import * as prettier from "@/lib/prettier";

export const instructions = `
You are a senior TypeScript developer. Your job is to create a React component in TypeScript. You will be given a minified JavaScript code snippet of the component, as well as one or more examples of how JSX is rendered to HTML.

Your task is to write a React component that maps the example input JSX to output HTML.

Guidelines when writing the component:
- Always start by importing React
- The component should be written in TypeScript
- Use JSX syntax instead of React.createElement whenever possible
- Export the component props using the name of the component, followed by the word "Props". E.g \`MyComponentProps\`
- If your component uses the same props as an internally used component, you should import the internally used component props type instead of redeclaring the same props type.
- The implementation should be as minimal as possible while still mapping the JSX to the HTML
- You will be provided with a list of internally used components. These components are used by the component you are writing. You must figure out how to use these components as much as possible, so that we minimize reimplementation of the same logic. Make sure to import internally used components, don't redeclare them in the TypeScript.
- The minified JavaScript code can be used as inspiration, but you should not use it directly as there might be redundant code in the JavaScript.
- If instructed, give the component a descriptive name. Otherwise, just use the name of the component.
- Some Reat components include SVGs and SVG paths. The SVG paths are often very long and have been replaced with placeholders. The placeholders follow the format [[SVG:0|PATH:0|NAME:...|DESCRIPTION:...]]. When you see these placeholders, you should repeat them verbatim. They will later be replaced with the original SVG paths.

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

export interface MyComponentProps {
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
  examples: Array<{ jsx: string; html: string }>,
  options: { maxNumExamples: number }
) => {
  const unique = examples.filter(
    (ex, index, self) =>
      index === self.findIndex((t) => t.jsx === ex.jsx && t.html === ex.html)
  );

  const numExamples = Math.min(unique.length, options.maxNumExamples);
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
        `\`\`\`javascript\n${instance.jsx}\n\`\`\``,
        "",
        "Output HTML",
        `\`\`\`html\n${instance.html}\n\`\`\``,
        "",
      ]),
  ].join("\n");
};

export const buildErrorsUserMessage = (errors: string[]) =>
  [
    "**Error Report:**",
    "When compiling the code of the component, the following errors were encountered:",
    "",
    ...errors,
  ].join("\n");

export const renderErrorsUserMessage = (
  errors: Array<{ message: string; description: string }>[],
  examples: Array<{ jsx: string; html: string }>,
  options: { maxNumExamples: number }
) => {
  const { errors: errorsToShow } = errors.reduce(
    ({ errors, count }, e) =>
      count === options.maxNumExamples
        ? { errors, count }
        : { errors: [...errors, e], count: count + Number(!!e.length) },
    { errors: [] as typeof errors, count: 0 }
  );

  return [
    `
**Error Report:**
When rendering the component, the HTML output of ${errors.length} does not match the expected HTML. Below are the first ${errorsToShow.length} examples.

**Instructions:**

* The differences are shown as a **git diff**:
  * Lines prefixed with \`+\` represent what **should be present** (expected output), but is not. These should be added to make the component correct.
  * Lines prefixed with \`-\` represent what the component in the previous message **is rendering but should not** (actual incorrect output). These should be removed to make the component correct.
* First, analyze the diff to understand the discrepancies between expected and actual HTML.
* Next, explain what went wrong in the component.
* Then, propose potential solutions.
  * If it cannot be fixed, state that clearly.
  * If it can be fixed, create a brief outline for how to solve it. Thereafter provide the corrected component code with the fix implemented, following the below output format.

**Output Format:**
Follow the format below when providing the updated version of the component:

# ComponentName
\`\`\`typescript
<your updated component code here>
\`\`\`
`.trim(),
    ``,
    "# Examples",
    ...errorsToShow.flatMap((error, index) => [
      `## Example ${index + 1}`,
      ...(error.length
        ? [
            "Found errors while rendering the component",
            ...error.flatMap((e) => [`- ${e.message}`, e.description]),
            "Input JSX",
            "```javascript",
            examples[index]?.jsx,
            "```",
          ]
        : ["Status: Success"]),
    ]),
  ].join("\n");
};
