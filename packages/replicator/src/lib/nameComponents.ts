import { config } from "@/config";
import { generateObject } from "ai";
import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import prettier from "prettier/standalone";
import z from "zod";

export interface ComponentSignature {
  id: string;
  tsx: string;
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

export async function nameComponents(
  components: ComponentSignature[]
): Promise<Record<string, string>> {
  if (components.length === 0) return {};

  const formattedComponents = await prettier.format(
    components.map((b) => `const ${b.id} = () => (${b.tsx});`).join("\n"),
    { parser: "babel", plugins: [parserBabel, parserEstree] }
  );

  const { object } = await generateObject({
    model: config.componentNaming.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: formattedComponents },
    ],
    schema: z.object(
      Object.fromEntries(
        components.map((b) => [
          b.id,
          z.string().regex(/^[A-Z][A-Za-z0-9_]*$/, "must be PascalCase"),
        ])
      )
    ),
    providerOptions: {
      openai: { reasoningEffort: "low", strictJsonSchema: true },
    },
  });
  return object;
  // return Object.fromEntries(object.componentNames.map((c) => [c.id, c.name]));
}
