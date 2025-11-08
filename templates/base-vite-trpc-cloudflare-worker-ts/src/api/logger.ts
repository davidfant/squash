import packageJson from "../../package.json";

type Level = "debug" | "info" | "warn" | "error";

const log =
  (level: Level) =>
  (message: string, data: Record<string, unknown> = {}) =>
    console.log(
      JSON.stringify({
        __squash: true,
        message,
        level,
        data,
        package: packageJson.name,
        version: packageJson.version,
        timestamp: new Date().toISOString(),
      })
    );

export const logger = {
  debug: log("debug"),
  info: log("info"),
  warn: log("warn"),
  error: log("error"),
};
