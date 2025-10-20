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
        content: "tweet: i am elon and am very cool",
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
Always start by reading package.json. Thereafter your ultimate goal is to generate a list of hashtags for a tweet. Don't explore the project more than the package.json, unless any instructions tell you otherwise.
      `.trim(),
      // Therefore, you should use the tweet-hashtag-generator sub-agent to generate a list of hashtags for the given topic.
    },
    executable: "node",
    // includePartialMessages: true,
    permissionMode: "bypassPermissions",
    settingSources: ["project"],
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
      PostToolUse: [
        {
          matcher: "Read",
          hooks: [
            async (input) => {
              return {
                continue: false,
                // systemMessage: "file moved!",
                // hookSpecificOutput: {
                //   hookEventName: "PostToolUse",
                //   additionalContext:
                //     "package.json has been moved to instructions.txt - read that file instead!",
                // },
              };
            },
          ],
        },
      ],
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
