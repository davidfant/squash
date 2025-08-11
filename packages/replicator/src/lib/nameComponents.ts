import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import prettier from "prettier/standalone";
import z from "zod";

export interface ComponentSignature {
  id: string;
  jsx: string;
}

const systemPrompt = `
You are a React component naming assistant.
Given a batch of React function components declared as constants (BUTTON1, BUTTON2, ...),
propose concise, idiomatic, PascalCase component names describing their role and style.
The output MUST contain a mapping of component id to name, where the name needs to follow the rules below:
- Use PascalCase; no spaces or special characters.
- Prefer descriptive names like PrimaryButton, GhostButton, CTAButton, IconButton, etc.
- If multiple are similar, differentiate with Clear, Subtle, Destructive, Outline, etc.
- Avoid duplicates. Ensure all keys in input are present in output.
- Do not include explanations — only return the JSON object.
`;

export async function nameComponents(opts: {
  model: string;
  components: ComponentSignature[];
}): Promise<Record<string, string>> {
  if (opts.components.length === 0) return {};

  const components = await prettier.format(
    opts.components.map((b) => `const ${b.id} = () => (${b.jsx});`).join("\n"),
    { parser: "babel", plugins: [parserBabel, parserEstree] }
  );

  // const model = wrapLanguageModel({
  //   model: openai(opts.model),
  //   middleware: filesystemCacheMiddleware(),
  // });
  const model = openai(opts.model);

  const { object } = await generateObject({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: components },
    ],
    schema: z.object({
      componentNames: z
        .object({
          id: z.enum(opts.components.map((b) => b.id) as [string, ...string[]]),
          name: z.string().regex(/^[A-Z][A-Za-z0-9_]*$/, "must be PascalCase"),
        })
        .array(),
    }),
    providerOptions: {
      openai: { reasoningEffort: "low", strictJsonSchema: true },
    },
  });
  return Object.fromEntries(object.componentNames.map((c) => [c.id, c.name]));
}
