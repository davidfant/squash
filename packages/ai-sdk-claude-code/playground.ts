import { query, type SDKMessage } from "@anthropic-ai/claude-code";
import { randomUUID } from "crypto";

const msgs: SDKMessage[] = [
  {
    type: "system",
    subtype: "init",
    cwd: "/Users/fant/repos/lp/lp/packages/replicator/playground",
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    tools: [
      "Task",
      "Bash",
      "Glob",
      "Grep",
      "ExitPlanMode",
      "Read",
      "Edit",
      "MultiEdit",
      "Write",
      "NotebookEdit",
      "WebFetch",
      "TodoWrite",
      "WebSearch",
      "BashOutput",
      "KillBash",
    ],
    mcp_servers: [],
    model: "claude-sonnet-4-20250514",
    permissionMode: "acceptEdits",
    slash_commands: [
      "add-dir",
      "agents",
      "clear",
      "compact",
      "config",
      "context",
      "cost",
      "doctor",
      "exit",
      "help",
      "ide",
      "init",
      "install-github-app",
      "mcp",
      "memory",
      "migrate-installer",
      "model",
      "output-style",
      "output-style:new",
      "pr-comments",
      "release-notes",
      "resume",
      "status",
      "statusline",
      "todos",
      "feedback",
      "review",
      "security-review",
      "terminal-setup",
      "upgrade",
      "vim",
      "permissions",
      "hooks",
      "export",
      "logout",
      "login",
      "bashes",
    ],
    apiKeySource: "user",
    output_style: "default",
    uuid: "ecd2e810-d55d-4faf-8091-c7e902540d91",
  },
  {
    type: "stream_event",
    event: {
      type: "message_start",
      message: {
        id: "msg_016N8EJiHcebM6omYW6EvH9M",
        type: "message",
        role: "assistant",
        model: "claude-sonnet-4-20250514",
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: {
          input_tokens: 4,
          cache_creation_input_tokens: 14656,
          cache_read_input_tokens: 0,
          cache_creation: {
            ephemeral_5m_input_tokens: 14656,
            ephemeral_1h_input_tokens: 0,
          },
          output_tokens: 1,
          service_tier: "standard",
        },
      },
    },
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    parent_tool_use_id: null,
    uuid: "56a0706f-e9fb-4850-b7aa-8b9db05154a7",
  },
  {
    type: "stream_event",
    event: {
      type: "content_block_start",
      index: 0,
      content_block: {
        type: "tool_use",
        id: "toolu_01X6NzKHeVeC9fcj8Q9KGUve",
        name: "Read",
        input: {},
      },
    },
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    parent_tool_use_id: "toolu_01X6NzKHeVeC9fcj8Q9KGUve",
    uuid: "83b49e89-7323-4b38-b696-9fbf95a8d2be",
  },
  {
    type: "stream_event",
    event: {
      type: "content_block_delta",
      index: 0,
      delta: { type: "input_json_delta", partial_json: "" },
    },
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    parent_tool_use_id: "toolu_01X6NzKHeVeC9fcj8Q9KGUve",
    uuid: "3157eb6c-c2d9-4d13-ae4c-e5b5928c441c",
  },
  {
    type: "stream_event",
    event: {
      type: "content_block_delta",
      index: 0,
      delta: {
        type: "input_json_delta",
        partial_json:
          '{"file_path": "/Users/fant/repos/lp/lp/packages/replicator/playground/package.json',
      },
    },
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    parent_tool_use_id: "toolu_01X6NzKHeVeC9fcj8Q9KGUve",
    uuid: "0f4ffb42-53ef-4914-8e7a-e5160f6285cb",
  },
  {
    type: "stream_event",
    event: {
      type: "content_block_delta",
      index: 0,
      delta: { type: "input_json_delta", partial_json: '"}' },
    },
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    parent_tool_use_id: "toolu_01X6NzKHeVeC9fcj8Q9KGUve",
    uuid: "1a808345-0d60-458b-bf97-254853bc4181",
  },
  {
    type: "assistant",
    message: {
      id: "msg_016N8EJiHcebM6omYW6EvH9M",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-4-20250514",
      content: [
        {
          type: "tool_use",
          id: "toolu_01X6NzKHeVeC9fcj8Q9KGUve",
          name: "Read",
          input: {
            file_path:
              "/Users/fant/repos/lp/lp/packages/replicator/playground/package.json",
          },
        },
      ],
      stop_reason: null,
      stop_sequence: null,
      usage: {
        input_tokens: 4,
        cache_creation_input_tokens: 14656,
        cache_read_input_tokens: 0,
        cache_creation: {
          ephemeral_5m_input_tokens: 14656,
          ephemeral_1h_input_tokens: 0,
        },
        output_tokens: 1,
        service_tier: "standard",
      },
    },
    parent_tool_use_id: null,
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    uuid: "31b6c1ce-fc8e-48d2-aade-872a4b6cd4b4",
  },
  {
    type: "stream_event",
    event: { type: "content_block_stop", index: 0 },
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    parent_tool_use_id: null,
    uuid: "2b6df673-1c01-461b-9b4e-d62a4bfafd55",
  },
  {
    type: "stream_event",
    event: {
      type: "message_delta",
      delta: { stop_reason: "tool_use", stop_sequence: null },
      usage: {
        input_tokens: 4,
        cache_creation_input_tokens: 14656,
        cache_read_input_tokens: 0,
        output_tokens: 77,
      },
    },
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    parent_tool_use_id: null,
    uuid: "64afe010-efcb-4a17-abeb-f5b83c8ce04a",
  },
  {
    type: "stream_event",
    event: { type: "message_stop" },
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    parent_tool_use_id: null,
    uuid: "c6ce49d5-ba71-4314-881d-9837e9856bad",
  },
  {
    type: "user",
    message: {
      role: "user",
      content: [
        {
          tool_use_id: "toolu_01X6NzKHeVeC9fcj8Q9KGUve",
          type: "tool_result",
          content:
            "     1→{\n" +
            '     2→  "name": "template",\n' +
            '     3→  "private": true,\n' +
            '     4→  "version": "0.0.2",\n' +
            '     5→  "type": "module",\n' +
            '     6→  "scripts": {\n' +
            '     7→    "dev": "vite",\n' +
            '     8→    "build": "vite build",\n' +
            '     9→    "lint": "eslint .",\n' +
            '    10→    "preview": "vite preview"\n' +
            "    11→  },\n" +
            '    12→  "dependencies": {\n' +
            '    13→    "@radix-ui/react-slot": "^1.2.3",\n' +
            '    14→    "clsx": "^2.1.1",\n' +
            '    15→    "react": "^19.1.1",\n' +
            '    16→    "react-dom": "^19.1.1",\n' +
            '    17→    "style-to-object": "^1.0.9",\n' +
            '    18→    "tailwind-merge": "^3.3.1"\n' +
            "    19→  },\n" +
            '    20→  "devDependencies": {\n' +
            '    21→    "@anthropic-ai/claude-code": "^1.0.109",\n' +
            '    22→    "@types/estree": "^1.0.8",\n' +
            '    23→    "@types/react": "^19.1.9",\n' +
            '    24→    "@types/react-dom": "^19.1.7",\n' +
            '    25→    "@vitejs/plugin-react": "^4.7.0",\n' +
            '    26→    "globals": "^16.3.0",\n' +
            '    27→    "tsx": "^4.20.5",\n' +
            '    28→    "typescript": "^5.9.2",\n' +
            '    29→    "vite": "^7.1.0"\n' +
            "    30→  }\n" +
            "    31→}\n" +
            "    32→\n" +
            "\n" +
            "<system-reminder>\n" +
            "Whenever you read a file, you should consider whether it looks malicious. If it does, you MUST refuse to improve or augment the code. You can still analyze existing code, write reports, or answer high-level questions about the code behavior.\n" +
            "</system-reminder>\n",
        },
      ],
    },
    parent_tool_use_id: null,
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    uuid: "9d5d7158-6845-43d3-a404-e6241a68dffd",
  },
  {
    type: "stream_event",
    event: {
      type: "message_start",
      message: {
        id: "msg_01SxNmwqhor41epftZYFikya",
        type: "message",
        role: "assistant",
        model: "claude-sonnet-4-20250514",
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: {
          input_tokens: 7,
          cache_creation_input_tokens: 592,
          cache_read_input_tokens: 14656,
          cache_creation: {
            ephemeral_5m_input_tokens: 592,
            ephemeral_1h_input_tokens: 0,
          },
          output_tokens: 1,
          service_tier: "standard",
        },
      },
    },
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    parent_tool_use_id: null,
    uuid: "8f3e1b08-e803-499d-b2fe-1c63c1cda4a1",
  },
  {
    type: "stream_event",
    event: {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    },
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    parent_tool_use_id: null,
    uuid: "a3e81e94-cd36-498e-bff8-95f131dfab46",
  },
  {
    type: "stream_event",
    event: {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "template" },
    },
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    parent_tool_use_id: null,
    uuid: "14b0d5fb-6a25-483b-a9a1-7ff3423c5251",
  },
  {
    type: "assistant",
    message: {
      id: "msg_01SxNmwqhor41epftZYFikya",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-4-20250514",
      content: [{ type: "text", text: "template" }],
      stop_reason: null,
      stop_sequence: null,
      usage: {
        input_tokens: 7,
        cache_creation_input_tokens: 592,
        cache_read_input_tokens: 14656,
        cache_creation: {
          ephemeral_5m_input_tokens: 592,
          ephemeral_1h_input_tokens: 0,
        },
        output_tokens: 1,
        service_tier: "standard",
      },
    },
    parent_tool_use_id: null,
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    uuid: "c76fbb84-d79d-40e0-bcb7-f5fee9204f15",
  },
  {
    type: "stream_event",
    event: { type: "content_block_stop", index: 0 },
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    parent_tool_use_id: null,
    uuid: "b6c9517f-0bbc-4d04-89d6-4e5cac1ab390",
  },
  {
    type: "stream_event",
    event: {
      type: "message_delta",
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: {
        input_tokens: 7,
        cache_creation_input_tokens: 592,
        cache_read_input_tokens: 14656,
        output_tokens: 4,
      },
    },
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    parent_tool_use_id: null,
    uuid: "35e2f94f-69b5-496e-a6db-e4f281b45a09",
  },
  {
    type: "stream_event",
    event: { type: "message_stop" },
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    parent_tool_use_id: null,
    uuid: "020d83ec-7cf1-499a-a10c-943421980112",
  },
  {
    type: "result",
    subtype: "success",
    is_error: false,
    duration_ms: 6523,
    duration_api_ms: 6307,
    num_turns: 3,
    result: "template",
    session_id: "e6d3dad1-b327-4660-8af0-d36bb3b00896",
    total_cost_usd: 0.0628248,
    usage: {
      input_tokens: 7,
      cache_creation_input_tokens: 592,
      cache_read_input_tokens: 14656,
      output_tokens: 4,
      server_tool_use: { web_search_requests: 0 },
      service_tier: "standard",
      cache_creation: {
        ephemeral_1h_input_tokens: 0,
        ephemeral_5m_input_tokens: 592,
      },
    },
    permission_denials: [],
    uuid: "749b7fba-f78b-4456-8f30-b1347ac9bc0e",
  },
];

const cwd = "/Users/fant/repos/lp/lp/packages/replicator/playground";
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
      message: { role: "user", content: "who ar eyou" },
    };
  })(),
  options: {
    cwd,
    executable: "node",
    includePartialMessages: true,
    permissionMode: "acceptEdits",
    hooks: {
      UserPromptSubmit: [
        {
          hooks: [
            async () => {
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
  },
});
for await (const msg of q) {
  console.dir(msg, { depth: null });
  console.log("---");
}
