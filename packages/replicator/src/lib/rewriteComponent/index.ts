import type { RefImport } from "@/types";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, wrapLanguageModel } from "ai";
import { filesystemCacheMiddleware } from "../filesystemCacheMiddleware";
import * as Prompts from "./prompts";
import { render } from "./render";
import type { ComponentInstance } from "./types";

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
  component: RefImport;
  instances: ComponentInstance[];
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
      { role: "system", content: Prompts.instructions },
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

  const rendered = await render({
    original: opts.component,
    rewritten,
    instances: opts.instances,
  });

  for (let i = 0; i < rendered.length; i++) {
    console.log("EXAMPLE", i);
    console.log("---");
    console.log(rendered[i]);
    console.log("---");
    console.log(opts.instances[i]?.html);
    console.log("---");
  }

  // // ❷ esbuild plugin that services any import that matches the map key
  // const virtualPlugin: esbuild.Plugin = {
  //   name: "virtual",
  //   setup(build) {
  //     build.onResolve({ filter: /.*/ }, (args) => {
  //       if (virtual[args.path] !== undefined) {
  //         return { path: args.path, namespace: "virtual" };
  //       }
  //       return; // let esbuild resolve real files normally
  //     });

  //     build.onLoad({ filter: /.*/, namespace: "virtual" }, (args) => ({
  //       contents: virtual[args.path],
  //       loader: "tsx",
  //     }));
  //   },
  // };

  // const out = await esbuild.build({
  //   entryPoints: ["sample.tsx"],
  //   format: "cjs",
  //   // format: "esm",
  //   bundle: true,
  //   platform: "node",
  //   write: false,
  //   jsx: "automatic",
  //   // tsconfig: 'tsconfig.json',
  //   plugins: [virtualPlugin],
  //   external: ["react"],
  // });

  // const js = out.outputFiles[0]!.text;
  // console.log("-----------------");
  // console.log(js);
  // console.log("-----------------");
  // const require = createRequire(import.meta.url);
  // const context: any = { module: { exports: {} }, exports: {}, require };
  // vm.runInNewContext(js, context, { filename: "sample.cjs" });
  // const { Sample } = context.module.exports;

  // // const mod = await import(
  // //   "data:text/javascript;base64," + Buffer.from(js).toString("base64")
  // // );
  // // const Sample = mod["Sample"];
  // if (!Sample) throw new Error(`Export "${Sample}" not found.`);

  // // ❺ Render and return HTML
  // const rendered = renderToStaticMarkup(React.createElement(Sample));
  // console.log("RENDERED");
  // console.log(await prettier.html(rendered));
  // console.log("-----------------");
  // console.log("EXPECTED");
  // console.log(opts.instances[0]!.html);
  // console.log("-----------------");

  // parse the component name and the code
}
