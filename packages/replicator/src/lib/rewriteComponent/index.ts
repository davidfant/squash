import * as prettier from "@/lib/prettier";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, wrapLanguageModel } from "ai";
import esbuild from "esbuild";
import { createRequire } from "node:module";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { filesystemCacheMiddleware } from "../filesystemCacheMiddleware";

// - import { cn } from "@/lib/utils"
const instructions = `
You are a senior TypeScript developer. Your job is to create a React component in TypeScript. You will be given a minified JavaScript code snippet of the component, as well as one or more examples of how JSX is rendered to HTML.

Your task is to write a React component that maps the example input JSX to output HTML.

Guidelines when writing the component:
- The component should be written in TypeScript
- The implementation should be as minimal as possible while still mapping the JSX to the HTML
- The minified JavaScript code can be used as inspiration, but you should not use it directly as there might be redundant code in the JavaScript.
- Give the component a descriptive name

When writing the component you are only allowed to import from the following libraries:
- React

Input format:
---
# Code
[minified JavaScript code]

# Examples
## Example 1
Input JSX
\`\`\`jsx
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
# ComponentName
\`\`\`tsx
[component code]
\`\`\`

Example output:
---
# MyComponent
interface Props {
  // ...
}

export function MyComponent({}: Props) {
  return <div />;
}
---
`.trim();

const model = wrapLanguageModel({
  // model: openai("gpt-5"),
  model: anthropic("claude-sonnet-4-20250514"),
  middleware: filesystemCacheMiddleware(),
});

function parseGeneratedComponent(md: string): {
  name: string;
  code: string;
} {
  // 1️⃣  Component name – first markdown H1 (`#`) we encounter
  const nameMatch = md.match(/^\s*#\s+([A-Za-z0-9_.-]+)/m);
  if (!nameMatch) {
    throw new Error(
      "Could not find a '# ComponentName' heading in model output"
    );
  }
  const name = nameMatch[1]!.trim();

  // 2️⃣  Code fence – first ```tsx / ```typescript / ```ts block
  const codeMatch = md.match(/```(?:tsx|typescript|ts)\s*([\s\S]*?)```/);
  if (!codeMatch) {
    throw new Error(
      "Could not find a TSX/TypeScript code block in model output"
    );
  }
  const code = codeMatch[1]!.trim();

  return { name, code };
}

export async function rewriteComponent(opts: {
  code: string;
  componentName: string;
  instances: Array<{ html: string; jsx: string }>;
}) {
  console.log("-----------------");
  console.log(
    [
      "# Code",
      opts.code,
      "",
      ...opts.instances.flatMap((instance, index) => [
        `## Example ${index + 1}`,
        "Input JSX",
        `\`\`\`jsx\n${instance.jsx}\`\`\``,
        "",
        "Output HTML",
        `\`\`\`html\n${instance.html}\`\`\``,
        "",
      ]),
    ].join("\n")
  );
  console.log("-----------------");

  const numExamples = Math.min(opts.instances.length, 10);
  const { text } = await generateText({
    model,
    messages: [
      { role: "system", content: instructions },
      {
        role: "user",
        content: [
          "# Code",
          opts.code,
          "",
          "# Examples",
          `Showing ${numExamples} of ${opts.instances.length} examples`,
          ...opts.instances
            .slice(0, numExamples)
            .flatMap((instance, index) => [
              `## Example ${index + 1}`,
              "Input JSX",
              `\`\`\`jsx\n${instance.jsx}\`\`\``,
              "",
              "Output HTML",
              `\`\`\`html\n${instance.html}\`\`\``,
              "",
            ]),
        ].join("\n"),
      },
    ],
  });

  const rewritten = parseGeneratedComponent(text);
  console.log("NAME", rewritten.name);
  console.log("-----------------");
  console.log(rewritten.code);
  console.log("-----------------");

  const virtual: Record<string, string> = {
    [`@/components/${rewritten.name}`]: rewritten.code,
    [`@/components/${opts.componentName}`]: `export { ${rewritten.name} as ${opts.componentName} } from '@/components/${rewritten.name}'`,
    "sample.tsx": opts.instances[0]!.jsx,
  };

  // ❷ esbuild plugin that services any import that matches the map key
  const virtualPlugin: esbuild.Plugin = {
    name: "virtual",
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (virtual[args.path] !== undefined) {
          return { path: args.path, namespace: "virtual" };
        }
        return; // let esbuild resolve real files normally
      });

      build.onLoad({ filter: /.*/, namespace: "virtual" }, (args) => ({
        contents: virtual[args.path],
        loader: "tsx",
      }));
    },
  };

  const out = await esbuild.build({
    entryPoints: ["sample.tsx"],
    format: "cjs",
    // format: "esm",
    bundle: true,
    platform: "node",
    write: false,
    jsx: "automatic",
    // tsconfig: 'tsconfig.json',
    plugins: [virtualPlugin],
    external: ["react"],
  });

  const js = out.outputFiles[0]!.text;
  console.log("-----------------");
  console.log(js);
  console.log("-----------------");
  const require = createRequire(import.meta.url);
  const context: any = { module: { exports: {} }, exports: {}, require };
  vm.runInNewContext(js, context, { filename: "sample.cjs" });
  const { Sample } = context.module.exports;

  // const mod = await import(
  //   "data:text/javascript;base64," + Buffer.from(js).toString("base64")
  // );
  // const Sample = mod["Sample"];
  if (!Sample) throw new Error(`Export "${Sample}" not found.`);

  // ❺ Render and return HTML
  const rendered = renderToStaticMarkup(React.createElement(Sample));
  console.log("RENDERED");
  console.log(await prettier.html(rendered));
  console.log("-----------------");
  console.log("EXPECTED");
  console.log(opts.instances[0]!.html);
  console.log("-----------------");

  // parse the component name and the code
}
