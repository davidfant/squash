import * as prettier from "@/lib/prettier";
import type { Metadata, RefImport } from "@/types";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, wrapLanguageModel } from "ai";
import type { Element, Root } from "hast";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeRecma from "rehype-recma";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { filesystemCacheMiddleware } from "../filesystemCacheMiddleware";
import { type CreateRefContext } from "../recma/createRef";
import { recmaFixProperties } from "../recma/fixProperties";
import { recmaRemoveRedundantFragment } from "../recma/removeRedundantFragment";
import { recmaReplaceRefs } from "../recma/replaceRefs";
import { rehypeStripSquashAttribute } from "../rehype/stripSquashAttribute";
import { recmaWrapAsComponent } from "../rehype/wrapAsComponent";
import { diffRenderedHtml } from "./diffRenderedHtml";
import * as Prompts from "./prompts";
import { render } from "./render";

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

export async function generateComponent(opts: {
  code: string;
  component: RefImport;
  createRefContext: CreateRefContext;
  instances: Array<{
    nodeId: Metadata.ReactFiber.NodeId;
    ref: Element;
    children: Element[];
  }>;
}): Promise<{ name: string; code: string }> {
  const processors = {
    html: unified().use(rehypeStripSquashAttribute).use(rehypeStringify),
    jsx: unified()
      .use(rehypeStripSquashAttribute)
      .use(rehypeRecma)
      .use(recmaJsx)
      .use(recmaRemoveRedundantFragment)
      .use(recmaWrapAsComponent, "Sample")
      .use(recmaReplaceRefs)
      .use(recmaFixProperties)
      .use(recmaStringify),
  };

  const [code, instances] = await Promise.all([
    prettier.js(`(${opts.code})`),
    Promise.all(
      opts.instances.map(async (i) => {
        const [jsx, html] = await Promise.all([
          processors.jsx
            .run({ type: "root", children: i.children })
            .then((estree) => processors.jsx.stringify(estree))
            .then(prettier.ts),
          processors.html
            .run({ type: "root", children: i.children } as Root)
            .then((t) => processors.html.stringify(t as Root))
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

  const numExamples = Math.min(uniqueInstances.length, 10);
  const content = [
    "# Code",
    code,
    "",
    "# Examples",
    `Showing ${numExamples} of ${uniqueInstances.length} examples`,
    ...uniqueInstances
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
  ].join("\n");
  console.log("---");
  console.log(content);
  console.log("---");
  const { text } = await generateText({
    model,
    messages: [
      { role: "system", content: Prompts.instructions },
      { role: "user", content },
    ],
  });

  const rewritten = parseGeneratedComponent(text);
  const rendered = await render({
    original: opts.component,
    rewritten,
    instances,
  });

  const diffs = rendered.map((r, i) => diffRenderedHtml(instances[i]!.html, r));
  if (diffs.some((d) => !!d)) {
    console.log(diffs);
    throw new Error("Failed to write correct component");
  }

  return rewritten;
}
