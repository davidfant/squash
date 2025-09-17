import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runClaudeCode } from "./agents/claude-code.js";
import { CLIOptionsSchema } from "./schema.js";

export async function main(argv: string[] = process.argv) {
  const controller = new AbortController();
  process.on("SIGINT", () => {
    console.log("Aborting Squash Agent...");
    controller.abort();
  });
  process.on("SIGTERM", () => {
    console.log("Aborting Squash Agent...");
    controller.abort();
  });

  const pkgRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const pkgJson = JSON.parse(
    await fs.readFile(path.join(pkgRoot, "package.json"), "utf8")
  );

  const program = new Command()
    .name("squash")
    .version(pkgJson.version)
    .option("--agent <name>", "claude-code", "claude-code")
    .option("--prompt <prompt>")
    .option("--session <json>")
    .option("--cwd <path>", "working directory for the agent", process.cwd())
    .option("--options <json>");
  //     .addHelpText(
  //       "after",
  //       `
  // Examples:
  //   $ squash "Hello Claude!"
  //   $ squash-agent ./prompt.md --agent codex
  //   $ cat prompt.json | squash-agent - --session ./latest.jsonl
  // `,
  //     )
  //     .showHelpAfterError();

  program.parse(argv);

  const opts = CLIOptionsSchema.parse(program.opts());
  if (opts.agent === "claude-code") {
    const session = await runClaudeCode(opts, controller.signal);
    console.log(JSON.stringify({ type: "@squashai/cli:done", session }));
  }

  // exit asap even if there are active handles (process._getActiveHandles)
  process.exit(0);
}
