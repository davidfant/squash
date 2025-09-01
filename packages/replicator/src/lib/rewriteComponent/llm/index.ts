import { generateText } from "@/lib/ai";
import type { Metadata } from "@/types";
import { anthropic } from "@ai-sdk/anthropic";
import { wrapLanguageModel, type ModelMessage } from "ai";
import path from "node:path";
import { filesystemCacheMiddleware } from "../../filesystemCacheMiddleware";
import type { RewriteComponentStrategy } from "../types";
import { buildInstanceExamples } from "./buildInstanceExamples";
import { diffRenderedHtml } from "./diffRenderedHtml";
import * as Prompts from "./prompts";
import { render } from "./render";

const MAX_NUM_EXAMPLES_IN_INITIAL_PROMPT = 5;
const MAX_NUM_EXAMPLES_IN_ERROR_PROMPT = 10;

type ComponentId = Metadata.ReactFiber.ComponentId;

const model = wrapLanguageModel({
  model: anthropic("claude-sonnet-4-20250514"),
  middleware: filesystemCacheMiddleware(),
});

function parseGeneratedComponent(md: string): {
  name: string;
  code: string;
} | null {
  // 1️⃣  Component name – first markdown H1 (`#`) we encounter
  const nameMatch = md.match(/^\s*#\s+([A-Za-z0-9_.-]+)/m);
  if (!nameMatch) {
    console.warn(
      "Could not find a '# ComponentName' heading in the model output"
    );
    console.error("---");
    console.error(md);
    console.error("---");
    return null;
  }
  const name = nameMatch[1]!.trim();

  // 2️⃣  Code fence – first ```tsx / ```typescript / ```ts block
  const codeRegex = /```(?:tsx|typescript|ts)\s*([\s\S]*?)```/g;
  const codeMatch =
    nameMatch &&
    [...md.matchAll(codeRegex)].find((m) => m.index! > nameMatch.index!);
  if (!codeMatch) {
    throw new Error(
      "Could not find a TSX/TypeScript code block in model output"
    );
  }
  const code = codeMatch[1]!.trim();

  return { name, code };
}

const buildComponentRegistryItem = (
  id: ComponentId,
  name: string,
  code: string
) => ({
  id,
  name: { value: name, isFallback: false },
  code,
  path: path.join("src/components/rewritten", id, `${name}.tsx`),
  module: path.join("@/components/rewritten", id, name),
});

export const rewriteComponentWithLLMStrategy: RewriteComponentStrategy = async (
  opts
) => {
  const registry = opts.componentRegistry;
  const registryItem = registry.get(opts.component.id);
  if (!registryItem) {
    throw new Error(`Component ${opts.component.id} not found in registry`);
  }

  const examples = await buildInstanceExamples(opts.instances, registry);
  const content = await Prompts.initialUserMessage(
    { code: opts.component.code, name: registryItem.name },
    [...opts.component.deps.internal]
      .map((id) => registry.get(id))
      .filter((i) => !!i)
      .map((i) => {
        if (!i.code) throw new Error(`Component ${i.id} has no code`);
        return { name: i.name.value, module: i.module, code: i.code };
      }),
    examples,
    { maxNumExamples: MAX_NUM_EXAMPLES_IN_INITIAL_PROMPT }
  );
  const messages: ModelMessage[] = [
    { role: "system", content: Prompts.instructions },
    { role: "user", content },
  ];

  let rewritten: { name: string; code: string } | null;
  let attempt = 0;
  while (true) {
    const { text, response } = await generateText({
      model,
      messages,
      maxOutputTokens: 8192,
    });
    rewritten = parseGeneratedComponent(text);
    if (!rewritten) break;

    registryItem.code = rewritten.code;
    const rendered = await render({
      component: {
        id: opts.component.id,
        name: rewritten.name,
        code: rewritten.code,
      },
      deps: opts.component.deps,
      instances: examples,
      componentRegistry: registry,
    });
    messages.push(...response.messages);

    const errors = rendered.map((r, i) => {
      const errors: Array<{ message: string; description: string }> = [];
      if (r.logs.length) {
        errors.push({
          message: "Warning logs",
          description: r.logs
            .map((l) => `[${l.level}] ${l.message}`)
            .join("\n"),
        });
      }

      if (r.html !== null) {
        const diff = diffRenderedHtml(examples[i]!.html, r.html);
        if (!!diff) {
          // console.log("---");
          // console.log(examples[i]!.html);
          // console.log("---");
          // console.log(r.html);
          // console.log("---");
          errors.push({
            message: "Differences in rendered HTML",
            description: `\`\`\`diff\n${diff}\n\`\`\``,
          });
        }
      }

      return errors;
    });

    if (errors.every((e) => !e.length)) break;
    attempt++;
    if (attempt === 3) {
      console.error("Failed to write correct component", errors);
      // throw new Error("Failed to write correct component");
      break;
    }

    messages.push({
      role: "user",
      content: await Prompts.errorsUserMessage(errors, examples, {
        maxNumExamples: MAX_NUM_EXAMPLES_IN_ERROR_PROMPT,
      }),
    });
  }

  if (!rewritten) throw new Error("TODO: what do we do if rewriting fails?");

  return buildComponentRegistryItem(
    opts.component.id,
    rewritten.name,
    rewritten.code
  );

  // throw new Error("dauym");

  // if (diffs.some((d) => !!d)) {
  //   diffs.forEach((d, i) => {
  //     if (d === null) {
  //       console.log("### DIFF", i, "SUCCESS");
  //       return;
  //     }
  //     const expected = examples[i]!.html;
  //     const actual = rendered[i];
  //     console.log("### DIFF", i, "ERROR");
  //     console.log(actual);
  //     console.log("---");
  //     console.log(expected);
  //     console.log("---");
  //     console.log(d);
  //     console.log("---");
  //   });
  //   throw new Error("Failed to write correct component");
  // }
};
