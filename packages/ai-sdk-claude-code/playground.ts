import { query } from "@anthropic-ai/claude-agent-sdk";
import { randomUUID } from "crypto";

const cwd = "/Users/fant/repos/test";
// const stream = streamText({
//   model: new ClaudeCodeLanguageModel(cwd),
//   prompt: [
//     {
//       role: "user",
//       content: [
//         { type: "text", text: "what is in the image" },
//         {
//           type: "image",
//           image:
//             "https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg",
//         },
//       ],
//     },
//   ],
//   tools,
// });

// for await (const chunk of stream.toUIMessageStream()) {
//   console.log(chunk);
// }

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
          "install the ms package using the bash command tool. if that fails, tell me the error",
      },
    };
  })(),
  options: {
    cwd,
    executable: "node",
    includePartialMessages: true,
    permissionMode: "bypassPermissions",
    hooks: {
      UserPromptSubmit: [
        {
          hooks: [
            async () => {
              console.log("XXX USER PROMPT SUBMIT");
              return {
                continue: true,
                systemMessage: "Always respond in Swedish",
              };
            },
          ],
        },
      ],
      SessionStart: [
        {
          hooks: [
            async () => {
              console.log("XXX session start");
              return { async: true };
            },
          ],
        },
      ],
    },
    mcpServers: {
      squash: {
        type: "sdk",
        name: "squash",
        instance: {
          type: "stdio",
          command: "squash",
          args: ["--agent", "claude-code"],
          env: {
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          },
        },
      },
    },
  },
});
for await (const msg of q) {
  console.dir(msg, { depth: null });
  console.log("---");
}
