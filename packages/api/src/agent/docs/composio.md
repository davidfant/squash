# Composio for Third-Party Integrations

You have access to **Composio**, which connects hundreds of third-party services (Gmail, Slack, Notion, HubSpot, etc.). Composio lets users connect to external apps via Composio's external authentication flow, and abstracts away the need to manage API keys, OAuth clients, and other credentials. When a user wants to integrate with external apps, default to using Composio instead of implementing the integration yourself.

Use the provided subagents for discovering and testing integrations. The reason is that these tasks consume a lot of tokens, and we want to avoid cluttering the main conversation with all of that context.

---

Follow this sequence **every time** you need a new external integration:

1. **Discover integrations**

   - Invoke the **`search-toolkits`** sub-agent with plain-language **use cases** (e.g. “send a Slack DM” or “create a HubSpot contact”).
   - The agent returns a list of candidate Composio toolkits and whether each one is already **connected** for the current user.

2. **Handle connection status**

   - The toolkit search step returns if a toolkit is connected or not.
   - **If already connected** → proceed to Step 3.
   - **If not connected** →
     Call `ConnectToToolkit` which will show the user a button to connect the ingration, and immediately afterwards, call the tool `WaitForConnection` to wait for the user to finish connecting. Don't send any message inbetween these tool calls.

3. **Test the flow (mandatory)**

   - Before writing production code, spin up the **`integration-tester`** sub-agent.
   - Provide the tester with the integrations you want it to use and a detailed description of what it should test
   - The tester will:
     - Execute the calls end-to-end in a sandbox.
     - Write **TypeScript definitions** for every tool's input and output.
     - Report any failures or missing scopes.
   - **Do not** proceed until the tester reports success.

4. **Confirm test results with user**

   - After the integration-tester completes, provide the user with a brief, plain-language summary of what was tested and what the results showed.
   - Ask the user to confirm that the test did what they expected before proceeding to implementation.
   - Example: "I tested creating a Slack message in the #general channel with the text 'Hello from Squash'. The test was successful and returned a message ID. Does this match what you expected?"

5. **Implement in API**

   - Use the validated TypeScript types from Step 3 to implement the integration in your API.
   - Keep inputs and outputs **fully typed** — no `any`.
   - If additional tools are required, repeat Steps 1–4 before coding.
   - Before implementing, you must have tested every single Composio tool you will need. If the user instructions changes what tools might be needed, always go back to step 3 to test the updated flow.
   - If you have used a Composio tool in the code without having first tested it, immediately go back to step 3 to test the Composio tool. This might result in chnages of the TypeScript types or an updated understanding of how the tool works, which might mean that the implementation needs to change.

Example API integration snippet:

```typescript
// api/types.ts
export namespace GoogleCalendar {
  export interface CreateEventInput {
    // ...
  }
  export interface CreateEventOutput {
    // ...
  }
}

// api/your-file.ts
import { env } from "cloudflare:workers";
import { GoogleCalendar } from "./types";
import { executeTool } from "./integrations/composio";

const createdEvent = await executeTool<GoogleCalendar.CreateEventInput, GoogleCalendar.CreateEventOutput>({
  tool: "GOOGLECALENDAR_CREATE_EVENT",
  userId: env.COMPOSIO_PLAYGROUND_USER_ID,
  input: { ... },
});
// createdEvent has shape { successful: boolean: error: string | null; data: GoogleCalendar.CreateEventOutput }
```

6. **Confirm with the user**

   - Once implemented, describe in plain terms what the integration now does.
   - Ask the user to try the feature in the live preview and confirm it works.

> **Shortcut rule**: If the user only wants to _explore_ whether something is possible, you may stop after Step 2 (or Step 4 if testing is quick) and summarize feasibility — no need to write backend code yet.
