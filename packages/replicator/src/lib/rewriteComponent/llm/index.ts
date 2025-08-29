import { generateText } from "@/lib/ai";
import * as prettier from "@/lib/prettier";
import { anthropic } from "@ai-sdk/anthropic";
import { wrapLanguageModel } from "ai";
import type { Root } from "hast";
import path from "node:path";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeRecma from "rehype-recma";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { filesystemCacheMiddleware } from "../../filesystemCacheMiddleware";
import { recmaFixProperties } from "../../recma/fixProperties";
import { recmaRemoveRedundantFragment } from "../../recma/removeRedundantFragment";
import { recmaReplaceRefs } from "../../recma/replaceRefs";
import { rehypeStripSquashAttribute } from "../../rehype/stripSquashAttribute";
import { rehypeUnwrapRefs } from "../../rehype/unwrapRefs";
import { recmaWrapAsComponent } from "../../rehype/wrapAsComponent";
import type { RewriteComponentStrategy } from "../types";
import { diffRenderedHtml } from "./diffRenderedHtml";
import * as Prompts from "./prompts";
import { render } from "./render";

// TODO: is this needed?
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

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

export const rewriteComponentWithLLMStrategy: RewriteComponentStrategy = async (
  opts
) => {
  const registry = opts.componentRegistry;
  const registryItem = registry.get(opts.component.id);
  if (!registryItem) {
    throw new Error(`Component ${opts.component.id} not found in registry`);
  }

  // const pp = unified()
  //   .use(rehypeStripSquashAttribute)
  //   .use(rehypeUnwrapRefs)

  //   .use(rehypeRecma)
  //   .use(recmaJsx)
  //   .use(recmaRemoveRedundantFragment)
  //   .use(recmaStringify);
  // console.log(
  //   "XXXXXXXX",
  //   await pp
  //     .run({ type: "root", children: opts.instances[0]!.children })
  //     .then((t) => pp.stringify(t))
  //   // .use(() => (tree) => toHast(tree, { space: "html" }))
  // );
  const processors = {
    html: unified()
      .use(rehypeStripSquashAttribute)
      .use(rehypeUnwrapRefs)

      // .use(rehypeRecma)
      // .use(recmaJsx)
      // .use(() => (tree) => toHast(tree, { space: "html" }))

      .use(rehypeStringify),
    jsx: unified()
      .use(rehypeStripSquashAttribute)
      .use(rehypeRecma)
      .use(recmaJsx)
      .use(recmaRemoveRedundantFragment)
      .use(recmaWrapAsComponent, "Sample")
      .use(recmaReplaceRefs, { componentRegistry: registry })
      .use(recmaFixProperties)
      .use(recmaStringify),
  };

  const [code, instances] = await Promise.all([
    prettier.js(`(${opts.component.code})`),
    Promise.all(
      opts.instances.map(async (i) => {
        const [jsx, html] = await Promise.all([
          processors.jsx
            .run({ type: "root", children: [i.ref] })
            .then((estree) => processors.jsx.stringify(estree))
            .then(prettier.ts),
          processors.html
            .run({ type: "root", children: i.children } as Root)
            .then((t: any) => processors.html.stringify(t as Root))
            .then(prettier.html),
        ]);
        return { jsx, html };
      })
    ),
  ]);

  const uniqueInstances = instances.filter(
    (instance, index, self) =>
      index ===
      self.findIndex((t) => t.jsx === instance.jsx && t.html === instance.html)
  );

  const numExamples = Math.min(uniqueInstances.length, 5);
  const content = [
    "# Code",
    "```javascript",
    code,
    "```",
    "",
    "# Examples",
    `Showing ${numExamples} of ${uniqueInstances.length} examples`,
    ...uniqueInstances
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
  console.log("---");
  console.log(content);
  console.log("--- WOW");
  const { text } = await generateText({
    model,
    messages: [
      { role: "system", content: Prompts.instructions },
      { role: "user", content },
    ],
  });

  console.log("---", "LLM OUTPUT");
  console.log(text);
  console.log("---");

  const rewritten = parseGeneratedComponent(text);
  registryItem.code = rewritten.code;
  const rendered = await render({
    component: { name: rewritten.name, code: rewritten.code },
    deps: opts.component.deps,
    instances,
    componentRegistry: registry,
  });

  const diffs = rendered.map((r, i) => diffRenderedHtml(instances[i]!.html, r));
  if (diffs.some((d) => !!d)) {
    diffs.forEach((d, i) => {
      if (d === null) return;
      const expected = instances[i]!.html;
      const actual = rendered[i];
      console.log("### ERROR ###", i);
      console.log(actual);
      console.log("---");
      console.log(expected);
      console.log("---");
      console.log(d);
      console.log("---");
    });
    throw new Error("Failed to write correct component");
  }

  return {
    id: opts.component.id,
    name: { value: rewritten.name, isFallback: false },
    code: rewritten.code,
    path: path.join(
      "src/components/rewritten",
      opts.component.id,
      `${rewritten.name}.tsx`
    ),
    module: path.join(
      "@/components/rewritten",
      opts.component.id,
      rewritten.name
    ),
  };
};
