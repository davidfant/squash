import { query } from "@anthropic-ai/claude-agent-sdk";
import { randomUUID } from "crypto";
import path from "path";
import * as timers from "timers/promises";
import * as ts from "typescript";

// const cwd = "/Users/fant/repos/test";
const cwd =
  "/Users/fant/repos/squash/templates/base-vite-trpc-cloudflare-worker-ts";

type StatusCallback = (diag: ts.Diagnostic) => void;
const statusCallbacks = new Map<string, StatusCallback>();

function startTypeScriptWatch() {
  const configFile = ts.findConfigFile(cwd, ts.sys.fileExists);
  if (!configFile) {
    throw new Error("No tsconfig.json found");
  }

  const host = ts.createWatchCompilerHost(
    configFile,
    { noEmit: true },
    ts.sys,
    ts.createSemanticDiagnosticsBuilderProgram,
    () => {},
    (diag) => {
      setTimeout(() => statusCallbacks.forEach((cb) => cb(diag)), 0);
    }
  );

  return ts.createWatchProgram(host);
}

const watch = startTypeScriptWatch();

function getTscErrorSummary(cwd: string) {
  const diags = ts.getPreEmitDiagnostics(watch.getProgram().getProgram());
  if (!diags.length) return; // nothing to report
  const formatted = ts.formatDiagnosticsWithColorAndContext(
    ts.sortAndDeduplicateDiagnostics([...diags]),
    {
      getCanonicalFileName: (f) => path.relative(cwd, f),
      getCurrentDirectory: () => cwd,
      getNewLine: () => ts.sys.newLine,
    }
  );
  // return stripAnsi(formatted);
  return formatted;
}

function isFileInProject(filePath: string) {
  const configFile = ts.findConfigFile(cwd, ts.sys.fileExists);
  if (!configFile) {
    throw new Error("No tsconfig.json found");
  }
  const configFileReadResult = ts.readConfigFile(configFile, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    configFileReadResult.config,
    ts.sys,
    path.dirname(configFile),
    {},
    configFile
  );
  return parsed.fileNames.includes(filePath);
}

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
          "read the contents of src/test.ts and write it to `export const a: number = '" +
          (Date.now() % 1000) +
          "';` without asking questions",
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
          matcher: "Write|Edit|MultiEdit|NotebookEdit",
          hooks: [
            async (input, toolUseId) => {
              if (input.hook_event_name !== "PostToolUse" || !toolUseId) {
                return { continue: true };
              }

              const filePath = (input.tool_input as { file_path: string })
                .file_path;
              if (!isFileInProject(filePath)) {
                return { continue: true };
              }

              const waitForCompilationDone = await Promise.race<boolean>([
                timers.setTimeout(3_000).then(() => false),
                new Promise((r) =>
                  statusCallbacks.set(toolUseId, (diag) => {
                    if (diag.code === 6193 || diag.code === 6194) {
                      r(true);
                    }
                  })
                ),
              ]).finally(() => statusCallbacks.delete(toolUseId));

              if (!waitForCompilationDone) return { continue: true };
              return {
                continue: true,
                hookSpecificOutput: {
                  hookEventName: "PostToolUse",
                  additionalContext: getTscErrorSummary(cwd),
                },
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
