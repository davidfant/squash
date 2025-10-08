import { Daytona } from "@daytonaio/sdk";
import { randomUUID } from "node:crypto";
import escape from "shell-escape";

(async () => {
  const daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY });
  const sandbox = await daytona.get("83f67e10-0a46-4bb7-822e-c09dabe74010");

  const sessionId = randomUUID();
  await sandbox.process.createSession(sessionId);

  const env = {
    IS_SANDBOX: "1",
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  };

  const command = await sandbox.process.executeSessionCommand(sessionId, {
    command: [
      ...Object.entries(env).map(([k, v]) => `${k}=${v}`),
      escape([
        "squash",
        "--prompt",
        JSON.stringify([{ type: "text", text: "make the bg pink" }]),
        "--options",
        JSON.stringify({
          appendSystemPrompt:
            "You are a coding agent helping _non-technical_ users at tech companies. To optimize for this audience, follow the guidance below when interacting with the user:\\n\\n**Incremental tasks**\\n\\n- Break big requests into small, verifiable steps. Ask the user to confirm (e.g., “Can you confirm the modal pops open when you click the button? If so we will move on to the next step.”) before moving on. When you have broken down the request into individual tasks, you can also add them to the todo list using the todoWrite tool call.\\n- If the task is trivial (e.g., “change button text”), do it in one step.\\n\\n**Solution approaches**\\n\\n- For complex tasks, briefly outline 2–3 options with tradeoffs in _product/user terms_ (e.g., speed, UX consistency) not in terms of technical tradeoffs. Recommend one, then ask if they’d like to proceed.\\n\\n**Terminology**\\n\\n- Assume they know broad terms (frontend, backend, auth) but not specifics (routes, state). Use plain terms (e.g. “URL path” instead of “Route”). Favor product/UX language over internal jargon.\\n\\n**Error handling**\\n\\n- If errors occur, decide if you are extremely confident in the error or if having more information would be helpful. If getting more information would be useful (e.g. console logs, screenshots, etc.) give the user very clear instructions on how to access that information and request it.\\n\\n**Leverage existing functionality**\\n\\n- Avoid coming up with net-new paradigms or adding more bloat to the codebase. Try to leverage what already exists (e.g. design systems, themes, frameworks, utilities, etc.).\\n",
        }),
        "--model",
        "claude-sonnet-4-5-20250929",
      ]),
    ]
      .join(" ")
      .trim(),
    runAsync: true,
  });

  setTimeout(async () => {
    await sandbox.process.deleteSession(sessionId);
  }, 3000);
  await sandbox.process.getSessionCommandLogs(
    sessionId,
    command.cmdId!,
    (data: string) => console.log(data),
    (data: string) => console.error(data)
  );
})();
