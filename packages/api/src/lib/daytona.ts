import { Daytona, SandboxState } from "@daytonaio/sdk";

export async function loadSandbox(sandboxId: string, apiKey: string) {
  const daytona = new Daytona({ apiKey });
  const sandbox = await daytona.get(sandboxId);

  const sbx = await daytona.get(sandboxId);
  if (sbx.state !== SandboxState.STARTED) {
    await sbx.start().finally(() => sbx.waitUntilStarted(60));
  }
  return sandbox;
}
