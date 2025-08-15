import { hastToStaticModule, type HastNode } from "@/lib/hastToStaticModule";
import type { FileSink } from "@/lib/sinks/base";
import { anthropic, type AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { generateText, wrapLanguageModel } from "ai";
import crypto from "crypto";
import type { Root } from "hast";
import { visit } from "unist-util-visit";
import { filesystemCacheMiddleware } from "../../filesystemCacheMiddleware";

const componentsInstructions = `
You are a React design system expert. You will be given a list of buttons that have appeared in the HTML of a scraped website. Your task is to translate common button patterns into one or more reusable TypeScript Button components that we will add to our design system. Design system components must use the classes provided in the provided HTML, not use your own styling such as tailwind. If there are clusters of components that fundamentally work differently (e.g. the CSS classes are not at all or barely overlapping) it is acceptable to provide separate design system Button components for the different clusters. You should avoid creating design system buttons for usages that seem one-off, as we can always fall back to using a simple <button> or provide a specific <Button className={...} />

Aspects to consider when creating the design system components:
1. Try to disentangle the different component permutations, including what classes are connected to various variants, sizes, etc
2. Review the component children to see if the structure can be standardized within the component

You can draw inspiration from e.g. ShadCN for how to design button props that express the various permutations the provided components take. For example, properties such as size and variant might be useful. Also, you can use the util \`import { cn } from "@/lib/utils";\` to combine class names.

Respond with a list of design system components, each with a name and the file contents of the component

For example:
# Button
\`\`\`tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // ...
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  // ...
});
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
      matches.map((m, i) =>
        hastToStaticModule(m.node, { componentName: `Button${i}` })
      )
    );

    console.log("XXXX");
    console.log(["```tsx", ...instances, "```"].join("\n"));
    console.log("XXXX");

    const { text } = await generateText({
      model: wrapLanguageModel({
        model: anthropic("claude-sonnet-4-20250514"),
        middleware: filesystemCacheMiddleware(),
      }),
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

    const rewritten = await Promise.all(
      instances.slice(0, 4).map((m) =>
        generateText({
          model: wrapLanguageModel({
            model: openai("gpt-5-mini"),
            middleware: filesystemCacheMiddleware(),
          }),
          system: `
You are a React developer, tasked with migrating React components to a design system. You will be given a single React component and your task is to review the provided design system components and if possible rewrite the component to use the design system components.

Respond with a TypeScript code block containing the rewritten component. When referring to the design system components, use the \`UI\` namespace (e.g. \`<UI.Button size="small">Add</UI.Button>\`). Only respond with the recreated JSX without any imports. If it's not possible to recreate it using the components you provided, respond with null.

Example when it's possible to rewrite the component:
\`\`\`tsx
<UI.Button size="small">Add</UI.Button>
\`\`\`

Example when it's not possible to rewrite the component:
\`\`\`tsx
null
\`\`\`

Below are the design system components you can use:
${text}
`,
          prompt: m,
        })
      )
    );

    console.log("XXXX");
    console.log(text);
    // console.dir(toolCalls, { depth: null });
    console.log("XXXX");

    for (const r of rewritten) {
      console.log("\n\n\n\n\n\nWOWOWOWOWOWO");
      console.log(r.text);
    }

    // matches.forEach((match, index) => {
    //   // find everything between <example${index}
    //   const example = text.match(new RegExp(`<example${index}>(.*)</example${index}>`, "s"))?.[1];
    //   if (!example) return;
    //   const { text } = await generateText({
    //     model: model,
    //     messages: [{ role: "user", content: example }],
    //   });
    // })

    // console.log(matches.length);
    // console.log(new Set(matches.map((m) => m.classNames.join(" "))).size);
  };
