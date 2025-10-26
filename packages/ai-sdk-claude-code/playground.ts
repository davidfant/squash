import { query } from "@anthropic-ai/claude-agent-sdk";
import { randomUUID } from "crypto";

const cwd = "/Users/fant/repos/test";

const q = query({
  // prompt: "who are you?",
  prompt: (async function* () {
    yield {
      type: "user",
      session_id: randomUUID(),
      parent_tool_use_id: null,
      message: {
        role: "user",
        content:
          "discover the gmail send email tool using the discover-integrations subagent",
      },
    };
    await new Promise(() => {});
  })(),
  options: {
    cwd,
    systemPrompt: {
      type: "preset",
      preset: "claude_code",
      append: `

      `.trim(),
      // Therefore, you should use the tweet-hashtag-generator sub-agent to generate a list of hashtags for the given topic.
    },
    executable: "node",
    includePartialMessages: true,
    permissionMode: "bypassPermissions",
    settingSources: ["project"],
    mcpServers: {
      composio: {
        type: "sse",
        url: "https://mcp-composio-production.squash.workers.dev/sse",
        headers: {
          authorization: `Bearer ak_mj564Uy0taARAdOW7r3L:00000000-0000-0000-0000-000000000000`,
        },
      },
    },
    agents: {
      "discover-integrations": {
        description: `
    Surfaces the most relevant Composio toolkits & tools for a plain-language
    **use case** and reports whether each toolkit is already connected.
    
    • Invoke whenever the main agent needs a brand-new external capability.  
    • Always include a \`connected\` flag (\`true | false\`).  
    • Default to the 5 most relevant matches unless the caller requests more.
      `.trim(),

        tools: ["mcp__Composio__SearchTools"],
        prompt: `
    You are **Integrations Discovery Researcher**, a Claude Cloud Code sub-agent.
    
    ## Your mission
    When given a short, human-readable use case (e.g. “add a row to Airtable”),
    return the best Composio toolkits/tools to accomplish it, along with each
    toolkit's current connection status for the user.
    
    ## Workflow
    1. **Search Composio**  
       Call \`SearchTools\` with the provided keywords.
    
    2. **Rank & Limit**  
       • Rank results by relevance to the use case.  
       • Keep only the top 5 unless a different limit is supplied.
    
    3. **Annotate connection status**  
       For every toolkit in your shortlist, determine whether the user is already connected, which you can see in the \`SearchTools\` response.
    
    4. **Return the result**  
       Respond with *only* the JSON array below—no additional commentary.
    
    \`\`\`json
    [
      {
        "toolkit_slug": "AIRTABLE",
        "toolkit_name": "Airtable",
        "tool_slug": "AIRTABLE_CREATE_RECORD",
        "tool_name": "Create Record",
        "connected": false,
        "why_relevant": "Adds a row to a specified base/table"
      },
      {
        "toolkit_slug": "GOOGLE_SHEETS",
        "toolkit_name": "Google Sheets",
        "tool_slug": "GOOGLESHEETS_APPEND_ROW",
        "tool_name": "Append Row",
        "connected": true,
        "why_relevant": "Appends data to an existing sheet"
      }
    ]
    \`\`\``,
      },
    },

    //     agents: {
    //       "tweet-hashtag-generator": {
    //         description: "Generates a list of hashtags for a given topic.",
    //         prompt: `
    // You are **Tweet Hashtag Generator**, a specialised Claude sub-agent.
    // Your mission: generate a list of hashtags for a given topic. You should read instructions.txt and then return a list of hashtags that are relevant to the topic based on the instructions.
    //           `.trim(),
    //         tools: ["Read"],
    //       },
    //     },
    hooks: {
      // UserPromptSubmit: [
      //   {
      //     hooks: [
      //       async () => {
      //         console.log("XXX USER PROMPT SUBMIT");
      //         console.error("XXX USER PROMPT SUBMIT");
      //         return {
      //           continue: true,
      //           systemMessage: "Always respond in Swedish",
      //         };
      //       },
      //     ],
      //   },
      // ],
      // PostToolUse: [
      //   {
      //     matcher: "Read",
      //     hooks: [
      //       async (input) => {
      //         return {
      //           continue: false,
      //           // systemMessage: "file moved!",
      //           // hookSpecificOutput: {
      //           //   hookEventName: "PostToolUse",
      //           //   additionalContext:
      //           //     "package.json has been moved to instructions.txt - read that file instead!",
      //           // },
      //         };
      //       },
      //     ],
      //   },
      // ],
    },
  },
});

for await (const msg of q) {
  // write in gray text without using chalk

  // console.log("\x1b[90m");
  console.dir(msg, { depth: null });
  // console.log("\x1b[0m");
  // messageToStreamPart({
  //   enqueue: (part) => console.dir(part, { depth: null }),
  // } as any)(msg);
  console.log("---");
}
