# AI Gateway

The **AI Gateway** provides a unified, strongly-typed interface for working with multiple Large Language Model (LLM) providers — such as OpenAI, Anthropic, and Google — through a single consistent API. It routes all traffic via **Vercel’s AI SDK v5**, which automatically manages authentication, usage metering, and provider fallback logic.

This setup is useful whenever your project needs to **generate text, structured data, or other AI-powered results** without being tightly coupled to a specific vendor. It enables features like:

- **Dynamic provider selection** — switch between OpenAI, Anthropic, and Google models at runtime.
- **Type-safe AI responses** — via helpers like `generateObject` that enforce Zod-validated schemas.
- **Unified integration surface** — whether generating chat completions, tool outputs, or structured responses, the code path remains identical across providers.

---

You **do not need** to modify the gateway setup in `src/api/integrations/ai-gateway.ts`; simply pass the fully‑qualified model name (`provider/model-id`) to the helper exported from that file.

**Supported Providers & Model Naming**
The gateway exposes any model that the underlying provider supports. Prefix the model name with one of:

| Provider prefix     | Example model id                       | Supported helpers                |
| ------------------- | -------------------------------------- | -------------------------------- |
| `openai/`           | `openai/gpt-4o-mini`, `openai/gpt-5`   | `generateText`, `generateObject` |
| `anthropic/`        | `anthropic/claude-sonnet-4-5-20250929` | `generateText`                   |
| `google-ai-studio/` | `google-ai-studio/gemini-2.5-flash`    | `generateText`, `generateObject` |

> **Tip — unknown models:** New models appear frequently. If a user claims a model exists, **trust them and try it**. If the gateway returns _“model not found”_ or similar at runtime, handle the error and inform the user.

## AI Gateway Examples

**Generating Free‑form Text**

Use `generateText` from `./integrations/ai-gateway` to generate unstructured text completions.

```ts
import { gateway, generateText } from "./integrations/ai-gateway";

function generateHeadline(titleIdea: string) {
  const { text } = await generateText({
    model: gateway("openai/gpt-5"),
    prompt: `Write a catchy one‑sentence headline for: "${titleIdea}"`,
  });

  return text;
}
```

**Generating Typed Objects**

Use `generateObject` from `./integrations/ai-gateway` to generate structured data into a validated TypeScript type by supplying a **Zod** schema.

```ts
import { z } from "zod";
import { gateway, generateObject } from "./integrations/ai-gateway";

const recipeSchema = z.object({
  title: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.string(),
});

export async function createRecipe(idea: string) {
  const { object: recipe } = await generateObject({
    model: gateway("google-ai-studio/gemini-2.5-flash"),
    prompt: `Create a simple recipe for ${idea}. Return JSON only.`,
    schema: recipeSchema,
  });

  // recipe is fully typed & validated here
  return recipe;
}
```
