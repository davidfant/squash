import { Daytona } from "@daytonaio/sdk";
import dotenv from "dotenv";
import { setTimeout } from "timers/promises";

dotenv.config({ path: ".env" });

const daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY! });

const sandbox = await daytona.create({
  public: true,
  snapshot: "daytona-small",
  autoStopInterval: 1,
  autoDeleteInterval: 2,
});

(async () => {
  for (let i = 0; i < 120; i++) {
    await sandbox.process.executeCommand("pwd");
    await sandbox.refreshData();
    console.log(`${i} - ${sandbox.state}`, sandbox.updatedAt);
    await setTimeout(10_000);
  }
})().finally(() => sandbox.delete());
