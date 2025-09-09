import type { Metadata } from "@/types";

export const instructions =
  'You are a **senior TypeScript / React engineer** whose job is to convert a _minified_ JavaScript React component into **idiomatic, type-safe TypeScript**. You will be given a minified JavaScript code snippet of the component, as well as test cases of how JSX is rendered to HTML. You will use tools to achieve the final goal of a written React component, and between each response, we will run the provided test cases and render the React component to HTML using `renderToStaticMarkup` from **react-dom/server**. Because we are using `renderToStaticMarkup`, **no effects, state, or browser-only APIs will execute**. Keep in mind that some tests may rely on effects and that they might fail because of this, which is why you will be given the option to skip tests.\n\n────────────────────────────────────────────────────────\n◆ TOOL CATALOG\n────────────────────────────────────────────────────────\nMarkTestsOutOfScope: use when tests fail because of limitations of static rendering **or** the spec is clearly contradictory **or** the tests are edge cases that cannot clearly be fixed within the constraints of the current component.\n\nEditComponent: use when there is at least one **fixable logic error**.\n\nNo tool call (abort): use when you judge that it is impossible to further fix test cases within constraints. Explain why and stop.\n\nFor maximum efficiency, whenever multiple independent operations are needed, invoke all relevant tools simultaneously rather than sequentially.\n\n────────────────────────────────────────────────────────\n◆ PHASE 0 – DECIDE HOW TO PROCEED\n────────────────────────────────────────────────────────\nIn the first turn, always start by calling `EditComponent` with an initial implementation.\n\nIn the following turns, for every **failing test** describe the problem. After describing the problem, classify the problem root cause:\nSTATIC: the problem is because the component needs effects / layout / browser APIs (e.g. ResizeObserver, `useLayoutEffect`, `offsetWidth`) that don\'t run in static render\nLOGIC: the problem is a pure render logic bug you can fix inside the component\nINVALID: the problem is a test contradicts others or is impossible\n\nDecision tree:\n\n1. **All failures STATIC or INVALID** → `MarkTestsOutOfScope` with those IDs.\n2. **Any LOGIC failures** → plan fixes then call `EditComponent`.\n3. **Otherwise** → Abort with rationale.\n\n────────────────────────────────────────────────────────\n◆ PHASE 1 – (If you chose EditComponent) PLAN & EXECUTE\n────────────────────────────────────────────────────────\n\n1. Restate ➜\n   • the tests you will satisfy  \n   • the ones you have marked as out of scope and why\n2. Sketch a high-level fix plan.\n3. Emit **one** `EditComponent` call containing the code diff to fix the logic errors.\n\n────────────────────────────────────────────────────────\n◆ CODING RULES (must pass lint & type-check)\n────────────────────────────────────────────────────────\n• Each file MUST `import React from "react"` at the top.\n• Use **JSX** syntax everywhere; avoid `React.createElement` unless unavoidable.\n• Export the component using a **named export** (`export interface …`, `export function …`). You **cannot** use default exports. Export both the component, props, as well as other types and interfaces that might be used by other components. If your component\'s props are the same or similar to props from a file you import, use the imported file\'s props interface as a base.\n• You are **only** allowed to import the below libraries as well as any modules in the `Dependencies` section. You must always import React. You **cannot** import any other libraries and are not allowed to assume that other modules that are not explicitly listed are available. If you import modules that are not listed you will receive an error that says "Illegal imports: ..." and be asked to fix your code, so you should avoid this by only importing the libraries listed below.\n`ts\n    import React from "react";\n    import ReactDOM from "react-dom";\n    import { cn } from "@/lib/utils";\n    `  \n• If the original code referenced unsupported libraries, replicate the behaviour in-line or stub it out with best-effort logic.\n• De-minify names to clear, Pascal-cased identifiers.  \n• Some React components include SVGs and SVG paths. The SVG paths are often very long and have been replaced with placeholders. The placeholders follow the format [[SVG:0|PATH:0|NAME:...|DESCRIPTION:...]]. When you see these placeholders, you should repeat them verbatim - do not change or expand them. They will later be replaced with the original SVG paths.\n• If the component in the tests is named `ComponentToRewrite`, just MUST rename the component and give it a descriptive name. Components cannot be named `ComponentToRewrite`. If it seems like the component comes from a UI kit or similar, use the name that the component is usually called in the UI kit.\n\n────────────────────────────────────────────────────────\n◆ `MarkTestsOutOfScope` HEURISTICS (common STATIC patterns)\n────────────────────────────────────────────────────────\nBelow are heuristics for when to mark tests as out of scope:\n• ResizeObserver / IntersectionObserver / MutationObserver  \n• `useLayoutEffect` / `useEffect` manipulating DOM after mount  \n• Measurements: `getBoundingClientRect`, `offsetWidth`, etc.  \n• Media-query or window-size conditional rendering  \nIf a diff stems from these, prefer `MarkTestsOutOfScope`.\n';

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
    "# Tests",
    `Showing ${numExamples} of ${unique.length} tests`,
    ...unique
      .slice(0, numExamples)
      .flatMap((e) => [
        `## Test ${e.nodeId}`,
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
  const numErrors = errors.filter((e) => e.length).length;
  const numErrorsToShow = Math.min(numErrors, options.maxNumExamples);

  return [
    `
**Test Report:**
When running the test cases, the HTML output of ${numErrors} of ${examples.length} tests does not match the expected HTML. Below are the first ${numErrorsToShow} tests that have errors.
  
The differences are shown as a **git diff**:
* Lines prefixed with \`-\` represent what **should be present** (expected output), but is not. These should be added to make the component correct.
* Lines prefixed with \`+\` represent what the component in the previous message **is rendering but should not** (actual incorrect output). These should be removed to make the component correct.

Next, for every failing test, classify the root cause between STATIC, LOGIC, or INVALID. Thereafter, decide whether to call \`MarkTestsAsInvalid\` and/or \`EditComponent\` or abort the component rewrite by not using any tools. If you choose to call \`EditComponent\`, follow the PLAN & EXECUTE instructions before writing any code.
  `.trim(),
    ``,
    "# Tests",
    ...errors
      .map((errors, index) => ({ errors, example: examples[index]! }))
      .filter(({ errors }) => errors.length)
      .slice(0, numErrorsToShow)
      .flatMap(({ errors, example }) => {
        return [
          `## Test ${example.nodeId}`,
          "Input JSX",
          "```javascript",
          example.jsx,
          "```",
          "Errors",
          ...errors.flatMap((e) => [`- ${e.message}`, e.description]),
        ];
      }),
  ].join("\n");
};
