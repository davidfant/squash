import type { Metadata } from "@/types";

export const instructions = `
You are a senior TypeScript developer. Your job is to create a React component in TypeScript. You will be given a minified JavaScript code snippet of the component, as well as one or more examples of how JSX is rendered to HTML.

**Your tasks**  
1. **Understand the snippet** - de-minify it mentally and infer:  
   • the component's name (if missing, choose a concise, Pascal-cased name)
   • what the component does and any obvious UI/UX behaviour  
   • whether its render output uses *only* native DOM elements (e.g. \`<div>\`, \`<span>\` …) or calls other internal React components.

2. **Validate against the provided examples** - **before writing any code, study each JSX ⇨ HTML pair** and reason about how the component must behave so that the rendered HTML exactly matches the example output.
  • Treat the pairs as contractual tests, but **some examples may be invalid or mutually contradictory**.  
   • Do **not** alter the JSX in the examples. Adjust your component logic, default props, and conditional rendering as needed to make the HTML line up.  
   • Strive to satisfy **all** pairs; if after careful analysis a pair appears impossible to honour, you may proceed **provided you:**  
     1. Add a brief note in your reasoning (e.g. \`Example #2 produces different class names because …\`) listing the unsatisfied examples and why they seem incorrect.  
     2. Implement the component so that it passes every remaining example.  
   • Think through these mappings first; only once confident (or satisfied you've isolated bad pairs) should you proceed to coding.

2. **Rewrite the component into modern, idiomatic TypeScript** that preserves behaviour, observing **all** of these code-style rules:

   • Use **JSX** syntax everywhere; avoid \`React.createElement\` unless unavoidable.  
   • Declare an \`export interface <ComponentName>Props\` for the props **and export it**. If your component's props are the same or similar to props from a dependency, use the dependency's props interface as a base.
   • Export the component itself with \`export function <ComponentName>() { … }\` (or \`export const <ComponentName> = …\`), **not** a default export. Also export the props interface as well as other types and interfaces that might be used by other components.
   • You are allowed to import the following packages, and everything mentioned in dependencies:
     \`\`\`ts
import React from "react";
import ReactDOM from "react-dom";
import { cn } from "@/lib/utils";
     \`\`\`  
   • *No other packages* may be imported.
   • If the original code referenced unsupported libraries, replicate the behaviour in-line or stub it out with best-effort logic.
   • de-minify identifiers - choose descriptive Pascal-cased names for any obviously minified props, variables, or JSX children. For example, if there is a component \`xf\` used within the component that seems to be a button, rename it to \`Button\`.
   • Some React components include SVGs and SVG paths. The SVG paths are often very long and have been replaced with placeholders. The placeholders follow the format [[SVG:0|PATH:0|NAME:...|DESCRIPTION:...]]. When you see these placeholders, you should repeat them verbatim - do not change or expand them. They will later be replaced with the original SVG paths.

3. **Call the tool\`updateComponent\`** exactly once with a JSON argument that has the following shape. You MUST provide all the fields: name, description, typescript

\`\`\`json
{
  "code":  "<TypeScript code>",                  // string
  "name":        "<ComponentName>",              // string
  "description": "<What the component does>"     // short paragraph
}
\`\`\`
`.trim();

export const initialUserMessage = (
  code: string,
  name: string | undefined,
  deps: Array<{ module: string; description: string; code: { dts: string } }>,
  examples: Array<{
    nodeId: Metadata.ReactFiber.NodeId;
    jsx: string;
    html: string;
  }>,
  options: { maxNumExamples: number }
) => {
  const unique = examples.filter(
    (ex, index, self) =>
      index === self.findIndex((t) => t.jsx === ex.jsx && t.html === ex.html)
  );

  const numExamples = Math.min(unique.length, options.maxNumExamples);
  return [
    "# Existing Component Name",
    name ?? "N/A",
    "",
    "# Minified Code (used for inspiration)",
    "```javascript",
    code,
    "```",
    "",
    "# Dependencies",
    "```typescript",
    ...(!deps.length ? ["// No dependencies"] : []),
    ...deps.flatMap((dep) => [
      `/** ${dep.description} */`,
      `declare module "${dep.module}" {`,
      ...dep.code.dts
        .trim()
        .split("\n")
        .map((line) => `  ${line}`),
      `}`,
      "",
    ]),
    "```",
    "",
    "# Examples",
    `Showing ${numExamples} of ${unique.length} examples`,
    ...unique
      .slice(0, numExamples)
      .flatMap((e) => [
        `## Example ${e.nodeId}`,
        "Input JSX",
        `\`\`\`javascript\n${e.jsx}\n\`\`\``,
        "",
        "Output HTML",
        `\`\`\`html\n${e.html}\n\`\`\``,
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
  examples: Array<{
    nodeId: Metadata.ReactFiber.NodeId;
    jsx: string;
    html: string;
  }>,
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
  When rendering the component, the HTML output of ${errors.length} examples does not match the expected HTML. Below are the first ${errorsToShow.length} examples.
  
  **Instructions:**
  
  * The differences are shown as a **git diff**:
    * Lines prefixed with \`+\` represent what **should be present** (expected output), but is not. These should be added to make the component correct.
    * Lines prefixed with \`-\` represent what the component in the previous message **is rendering but should not** (actual incorrect output). These should be removed to make the component correct.
  * First, analyze the diff to understand the discrepancies between expected and actual HTML.
  * Next, explain what went wrong in the component.
  * Then, propose potential solutions.
    * If it cannot be fixed, state that clearly.
    * If it can be fixed, create a brief outline for how to solve it. Thereafter update the component
  `.trim(),
    ``,
    "# Examples",
    ...errorsToShow.flatMap((error, index) => [
      `## Example ${examples[index]!.nodeId}`,
      ...(error.length
        ? [
            "Found errors while rendering the component",
            ...error.flatMap((e) => [`- ${e.message}`, e.description]),
            "Input JSX",
            "```javascript",
            examples[index]!.jsx,
            "```",
          ]
        : ["Status: Success"]),
    ]),
  ].join("\n");
};
