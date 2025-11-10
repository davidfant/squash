import { Daytona } from "@daytonaio/sdk";

(async () => {
  const sandboxId = "b63e80a9-f8f9-4a7d-9ed4-467166a451e9";
  const sessionId = "a1286386-679e-4034-aa31-7769aa9327e8";
  const commandId = "faab9b76-4035-4121-9747-c29eccd856b6";

  const daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY });
  const sandbox = await daytona.get(sandboxId);

  const result = await sandbox.process.getSessionCommandLogs(
    sessionId,
    commandId
  );
  console.log(result.stdout?.length);
  console.log(result.stderr?.length);

  const counter = {
    stdout: 0,
    stderr: 0,
  };

  console.log("###123123###");
  // console.log(result.stdout);

  // console.log("---");

  await sandbox.process.getSessionCommandLogs(
    sessionId,
    commandId,
    (data) => {
      counter.stdout += data.length;
      console.log("stdout", counter.stdout);
      // process.stdout.write(data);
    },
    (data) => {
      counter.stderr += data.length;
      console.log("stderr", counter.stderr);
    }
  );
  console.log("###123123###");
})().catch(console.error);
