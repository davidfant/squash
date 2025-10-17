import { query } from "@anthropic-ai/claude-agent-sdk";
import { Composio } from "@composio/core";
import { randomUUID } from "crypto";

const cwd = "/Users/fant/repos/test";

const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });

const q = query({
  // prompt: "who are you?",
  prompt: (async function* () {
    yield {
      type: "user",
      session_id: randomUUID(),
      parent_tool_use_id: null,
      message: {
        role: "user",
        // content:
        //   "help me check my current google calendar events and my linear tickets",
        // content:
        //   "help me first find google calendar create event tool. wait until you get a response from the search tool, and thereafter  find the linear create ticket tool. don't ever do multiple searches in parallel",
        content: "help me list my current google calendar events",
      },
    };
  })(),
  options: {
    cwd,
    systemPrompt: {
      type: "preset",
      preset: "claude_code",
      append: `
Your ultimate goal is to create integration scripts that automate the work the user wants to accomplish. Therefore, after you have connected the tools relevant for the user's request, you should use the integration-tester sub-agent to try to execute the user's request using the available tools and integrations. You should NOT directly call the composio multi_execute_tool. If the integration-tester fails and you can provide the missing information or gather it by calling other tools, do so. If you cannot by yourself find the missing information, ask the user for it.
      `.trim(),
    },
    executable: "node",
    // includePartialMessages: true,
    permissionMode: "bypassPermissions",
    settingSources: ["project"],
    agents: {
      "integration-tester": {
        description: `
Tests if the current set of available tools and integrations is
sufficient to fulfil the user’s request.
• Use PROACTIVELY every time new connections are added or before executing a
  workflow.  
• If it can complete the task, it MUST return TypeScript types that describe
  the shape of the successful output **plus** a concise Markdown summary.  
• If it cannot complete the task, it MUST omit the TypeScript types and
  instead return only a Markdown summary explaining why and what’s missing.
        `.trim(),
        prompt: `
You are **Integration Tester**, a specialised Claude sub-agent.  
Your mission: given (1) the user’s high-level goal, (2) any structured
arguments the main agent passes (e.g. parsed parameters, examples, constraints),
try to test to execute the user's request using the available tools and integrations.

## 🛠 Workflow
1. **Gather Context** – First, request all integrations and tools that are available to you using the \`get_connected_tools\` tool.
2. **Test Execution** – Execute tools using the Composio MCP server to accomplish the user's request. If the request cannot be completed, return a summary of what went wrong, what information is missing, what types of tools or data are required, or any other relevant information that is needed to complete the request.
3. **Return Result** – If the user's request can be completed, return a summary of all the tool calls that were made to complete the request. Also, for each executed tool, return the TypeScript types wrapped in a \`\`\`ts block that describe the shape of the output of the tool. Exclude comments in the TypeScript types. For some tools, the TypeScript types are already provided when gathering context, while for other tools the result data is any or similar, in which case you should try to infer the TypeScript types from the result data.

### ✅ SUCCESS template
\`\`\`ts
export interface GoogleCalendarCreateEventOutput {
  ...
}
\`\`\`

**Summary**
* One bulleted sentence per major step (what you did and any key values).

---

### ❌ FAILURE template
**Summary**

* Clear, actionable explanation of why the request could not be completed.
* List the exact missing connections, scopes, or user clarifications needed.

---

*Never mix the two templates. Never emit extra content before or after.*

          `.trim(),
        tools: [
          "mcp__composio__multi_execute_tool",
          "mcp__composio__get_connected_tools",
        ],
      },
    },
    hooks: {
      // UserPromptSubmit: [
      //   {
      //     matcher: "*",
      //     hooks: [
      //       async () => {
      //         console.log("XXX USER PROMPT SUBMIT");
      //         return {
      //           continue: true,
      //           systemMessage: "Always respond in Swedish",
      //         };
      //       },
      //     ],
      //   },
      // ],
      // PreToolUse: [
      //   {
      //     matcher: "*",
      //     hooks: [
      //       async () => {
      //         console.error("XXX session start");
      //         return { async: true };
      //       },
      //     ],
      //   },
      // ],
    },
    // mcpServers: { composio: composioMcpServer },
    mcpServers: {
      composio: {
        type: "stdio",
        command: "npx",
        args: [
          "-y",
          "tsx",
          "/Users/fant/repos/squash/packages/ai-sdk-claude-code/src/exploration/composioMcp.ts",
        ],
      },
    },
  },
});
for await (const msg of q) {
  console.dir(msg, { depth: null });
  console.log("---");
}
