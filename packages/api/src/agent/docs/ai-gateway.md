# AI Gateway

The **AI Gateway** provides a unified, strongly-typed interface for working with multiple Large Language Model (LLM) providers — such as OpenAI, Anthropic, and Google — through a single consistent API. It routes all traffic via **Vercel’s AI SDK v5**, which automatically manages authentication, usage metering, and provider fallback logic.

This setup is useful whenever your project needs to **generate text, structured data, or other AI-powered results** without being tightly coupled to a specific vendor. It enables features like:

- **Dynamic provider selection** — switch between OpenAI, Anthropic, and Google models at runtime.
- **Type-safe AI responses** — via helpers like `generateObject` that enforce Zod-validated schemas.
- **Unified integration surface** — whether generating chat completions, tool outputs, or structured responses, the code path remains identical across providers.

---

You **do not need** to modify the gateway setup in `src/api/integrations/ai-gateway.ts`; simply pass the fully‑qualified model name (`provider/model-id`) to the helper exported from that file.

**Supported Providers & Model Naming**
The gateway exposes any model that the underlying provider supports. Use the provider‑specific helper you import from `./integrations/ai-gateway`.

```ts
import { openai, anthropic, google } from "./integrations/ai-gateway";

openai("gpt-5"); // OpenAI GPT‑5
anthropic("claude-sonnet-4-5-20250929"); // Anthropic Claude 4.5
google("gemini-2.5-flash-image"); // Google Gemini Flash (image variant)
```

**Quick capability cheat‑sheet**

| Model (examples)           | Helper to call   | Can generate…          | Supported helpers                |
| -------------------------- | ---------------- | ---------------------- | -------------------------------- |
| **GPT‑5 mini**, **GPT‑5**  | `openai()`       | Text, **Objects**      | `generateText`, `generateObject` |
| **GPT Image 1**            | `openai.image()` | **Images**             | `generateImage`                  |
| **Claude Sonnet 4.x**      | `anthropic()`    | Text only, NOT Objects | `generateText`                   |
| **Gemini 2.5 Flash**       | `google()`       | Text, Objects          | `generateText`, `generateObject` |
| **Gemini 2.5 Flash‑Image** | `google()`       | **Images**             | `generateText`                   |
| _Any other model_          | (appropriate)    | Depends on provider    | Varies                           |

> **Tip — unknown models:** New models appear frequently. If a user claims a model exists, **trust them and try it**. If the gateway returns _“model not found”_ or similar at runtime, handle the error and inform the user.

## AI Gateway Examples

**Generating Free‑form Text**

Use `generateText` from `./integrations/ai-gateway` to generate unstructured text completions.

```ts
import { anthropic, generateText } from "./integrations/ai-gateway";

function generateHeadline(titleIdea: string) {
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    prompt: `Write a catchy one‑sentence headline for: "${titleIdea}"`,
  });

  return text;
}
```

**Generating Typed Objects**

Use `generateObject` from `./integrations/ai-gateway` to generate structured data into a validated TypeScript type by supplying a **Zod** schema.

```ts
import { z } from "zod";
import { openai, generateObject } from "./integrations/ai-gateway";

const recipeSchema = z.object({
  title: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.string(),
});

export async function createRecipe(idea: string) {
  const { object: recipe } = await generateObject({
    model: openai("gemini-flash-latest"),
    prompt: `Create a simple recipe for ${idea}. Return JSON only.`,
    schema: recipeSchema,
  });

  // recipe is fully typed & validated here
  return recipe;
}
```

**Generating Images**
To generate images:

- use `generateImage` from `./integrations/ai-gateway` to generate images with `openai.image("gpt-image-1")`. The response includes `image` and an `images` array containing generated images, where each file has a `base64` property containing the image data.
- use `generateText` from `./integrations/ai-gateway` to generate images with `google("gemini-2.5-flash-image")`. The response might return text and a `files` array containing generated images, where each file has a `base64` property containing the image data.

```ts
import { openai, google, generateText } from "./integrations/ai-gateway";

export async function generateImageWithOpenAI(prompt: string) {
  const result = await generateImage({
    model: openai.image("gpt-image-1"),
    prompt: `Generate an image of: ${prompt}`,
  });

  if (result.image) throw new Error("No image was generated");

  // Convert base64 to a data URL for use in <img> tags
  const dataUrl = `data:image/png;base64,${result.image.base64}`;
  return dataUrl;
}

export async function generateImageWithGoogle(prompt: string) {
  const result = await generateText({
    model: google("gemini-2.5-flash-image"),
    prompt: `Generate an image of: ${prompt}`,
  });

  if (result.files.length) throw new Error("No image was generated");

  // Convert base64 to a data URL for use in <img> tags
  const image = result.files[0]!;
  const dataUrl = `data:image/png;base64,${image.base64}`;
  return dataUrl;
}
```

> **Note:** The `files` array may contain none or multiple images if the model generates more than one. Always check that `files` exists and has the expected length before accessing `files[number].base64`.
