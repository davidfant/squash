# AI Gateway × Composio Integration Guide

For **LLM-based features**, you should not use Composio and not do integration testing on them before implementation.

For LLM-based features you do **not** need to:

- Discover or connect these integrations.
- Authenticate or manage tokens.
- Test them via the integration tester.

If you’re working on a feature that **combines** AI and third-party tools (e.g. using Slack + GPT), handle them separately:

- Use Composio for the third-party tool.
- Use the AI Gateway for the AI model.
- When testing or simulating flows, you can “pretend” to be the AI — e.g., produce expected outputs, summaries, or mock data — without actually calling the model.

---

**Combining Composio and LLM**
For complex workflows and tasks, we might need to combine the AI Gateway with third party tools from Composio. If possible we should prefer using Composio and the AI gateway separately, but some tasks are only possible by having an LLM plan and use tools on the fly. By wiring the two together we let the model decide when it needs to call which Composio tools to accomplish the user's request and generate its answer.

```ts
import { z } from "zod";
import { generateObject } from "ai";
import { env } from "cloudflare:workers";
import { gateway } from "./integrations/ai-gateway";
import { getAIGatewayTools } from "./integrations/composio";

export async function reviewImportantPullRequests(
  userId: string,
  orgId: string
) {
  const userTools = getAIGatewayTools(userId, ["GOOGLECALENDAR_CREATE_EVENT"]);
  const orgTools = getAIGatewayTools(orgId, ["GITHUB_FIND_PULL_REQUESTS"]);
  const { text } = await generateText({
    model: gateway("anthropic/claude-sonnet-4-5-20250929"),
    prompt: `Find all open GitHub pull requests, and for the most important one, schedule a Google Calendar event with the author`,
    tools: { ...userTools, ...orgTools },
  });

  return text;
}
```
