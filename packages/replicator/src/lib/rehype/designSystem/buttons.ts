import { hastToStaticModule, type HastNode } from "@/lib/hastToStaticModule";
import type { FileSink } from "@/lib/sinks/base";
import { anthropic, type AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import crypto from "crypto";
import type { Root } from "hast";
import { visit } from "unist-util-visit";
import z from "zod";
import { createRef } from "../createRef";

const componentsInstructions = `
You are a React design system expert. You will be given a list of buttons that have appeared in the HTML of a scraped website. Your task is to translate common button patterns into one or more reusable TypeScript Button components that we will add to our design system. Design system components must use the classes provided in the provided HTML, not use your own styling such as tailwind. If there are clusters of components that fundamentally work differently (e.g. the CSS classes are not at all or barely overlapping) it is acceptable to provide separate design system Button components for the different clusters. You should avoid creating design system buttons for usages that seem one-off, as we can always fall back to using a simple <button> or provide a specific <Button className={...} />

Aspects to consider when creating the design system components:
1. Try to disentangle the different component permutations, including what classes are connected to various variants, sizes, etc
2. Review the component children to see if the structure can be standardized within the component
3. if a component in the original code can both have e.g. the button tag and div tag, in the design system component only use button, don't make the tag configurable

You can draw inspiration from e.g. ShadCN for how to design button props that express the various permutations the provided components take. For example:
- properties such as size and variant might be useful
- you can use the util \`import { cn } from "@/lib/utils";\` to combine class names

Respond with a list of design system components, where the header is the import path of the component (starting with @/components/ui/[[name]].tsx, and the code contains the file contents.

For example:
# @/components/ui/Button.tsx
\`\`\`tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // ...
}
export function Button(props: ButtonProps) {
  // ...
}
\`\`\`
`.trim();

function toClassNames(props: Record<string, any> | undefined): string[] {
  if (!props) return [];
  const value = props.className ?? props.class;
  if (!value) return [];
  const classNames = (Array.isArray(value) ? value : [value])
    .flatMap((v) => String(v).split(/\s+/))
    .filter(Boolean);
  return Array.from(new Set(classNames)).sort();
}

function computeHash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 8);
}

export function parseCodeBlocks(
  md: string
): { module: string; code: string }[] {
  const blocks: { module: string; code: string }[] = [];

  // `[\s\S]*?` = non-greedy “anything”, because the `.` wildcard
  // doesn’t match line breaks unless you use the /s flag (which Node <16 lacks).
  const pattern = /#\s+(.+?)\s*\n```tsx\s+([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(md)) !== null) {
    const [, module, code] = match;
    blocks.push({ module: module!.trim(), code: code!.trim() });
  }

  return blocks;
}

export const rehypeDesignSystemButtons =
  (sink: FileSink) => () => async (tree: Root) => {
    interface Match {
      parent: HastNode;
      index: number;
      node: HastNode;
      classNames: string[];
      signature: string;
    }
    const matches: Match[] = [];

    visit(
      tree,
      "element",
      (
        node: HastNode,
        index: number | undefined,
        parent: HastNode | undefined
      ) => {
        if (!parent || index == null) return;
        const tag: string = node.tagName;
        const props: Record<string, any> = node.properties || {};

        // Button-like detection (framework-agnostic)
        const isButtonTag = tag === "button";
        const hasRoleButton = props.role === "button";
        const hasTypeButton = props.type === "button"; // could be input/button
        if (!isButtonTag && !hasRoleButton && !hasTypeButton) return;

        const classNames = toClassNames(props);
        if (classNames.length === 0) return;

        const signature = computeHash(classNames.join(" "));
        matches.push({ parent, index, node, classNames, signature });
      }
    );

    const matchesBySignature = new Map<string, Match[]>();
    for (const match of matches) {
      matchesBySignature.set(match.signature, [
        ...(matchesBySignature.get(match.signature) || []),
        match,
      ]);
    }

    const instances = await Promise.all(
      // Array.from(matchesBySignature.values())
      //   .flat()
      //   .map((m) => hastToStaticModule(m.node))
      matches.map((m, i) => hastToStaticModule(m.node))
    );

    const { text } = await generateText({
      // model: wrapLanguageModel({
      //   model: anthropic("claude-sonnet-4-20250514"),
      //   middleware: filesystemCacheMiddleware(),
      // }),
      model: anthropic("claude-sonnet-4-20250514"),
      maxOutputTokens: 10000,
      messages: [
        { role: "system", content: componentsInstructions },
        {
          role: "user",
          // content: instances
          //   .map((s, index) => `# Example ${index}\n\`\`\`tsx\n${s}\n\`\`\``)
          //   .join("\n\n"),
          content: ["```tsx", ...instances, "```"].join("\n"),
        },
      ],
      providerOptions: {
        anthropic: {
          thinking: { type: "enabled", budgetTokens: 1024 },
        } satisfies AnthropicProviderOptions,
      },
    });

    await Promise.all(
      parseCodeBlocks(text).map(({ module, code }) =>
        sink.writeText(module.replace("@/", "src/"), code)
      )
    );

    const rewritten = await Promise.all(
      instances.slice(0, 9999).map((m) =>
        generateObject({
          // model: wrapLanguageModel({
          //   model: openai("gpt-5-mini"),
          //   middleware: filesystemCacheMiddleware(),
          // }),
          model: openai("gpt-5-mini"),
          schema: z.object({
            rewritten: z
              .object({
                imports: z
                  .object({
                    module: z
                      .string()
                      .describe(
                        "The module to import from, e.g. `@/components/ui/Button`"
                      ),
                    import: z
                      .string()
                      .array()
                      .describe(
                        "The items to import from the module, e.g. `default` or named exports (like `Button`)"
                      ),
                  })
                  .array(),
                jsx: z.string(),
              })
              .nullable(),
          }),
          system: `
You are a React developer, tasked with migrating React components to a design system. You will be given a single React component and your task is to review the provided design system components and if possible rewrite the component to use the design system components.

Respond with a rewritten component including:
1. a list of all imports, but exclude React
2. the rewritten component's pure JSX

Example when it's possible to rewrite the component:
\`\`\`
{
  "rewritten": {
    "imports": [
      { "module": "@/components/ui/Button", "import": ["Button"] },
      { "module": "@/svgs/MyIcon", "import": ["default"] }
    ],
    "jsx": "<Button size='small' icon={<MyIcon />}>Add</Button>"
  }
}
\`\`\`

Example when it's not possible to rewrite the component using the design system components:
\`\`\`
{
  "rewritten": null
}
\`\`\`

Below are the design system components you can use:
${text}
`,
          prompt: m,
        })
      )
    );

    rewritten.forEach((r, i) => {
      if (!r.object.rewritten) return;
      console.dir(r.object.rewritten, { depth: null });
      const match = matches[i]!;
      match.parent.children[match.index] = createRef({
        imports: r.object.rewritten.imports,
        jsx: r.object.rewritten.jsx,
      });
    });
  };
