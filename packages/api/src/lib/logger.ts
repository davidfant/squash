type Level = "debug" | "info" | "warn" | "error";

const log = (level: Level) => (message: string, data?: unknown) =>
  console.log({ level, message, data });

export const logger = {
  debug: log("debug"),
  info: log("info"),
  warn: log("warn"),
  error: log("error"),
};
