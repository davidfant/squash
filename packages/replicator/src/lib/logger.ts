import winston from "winston";

const colorizer = winston.format.colorize({ colors: { data: "grey" } });
export const logger = winston.createLogger({
  // level: "debug",
  level: "info",
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        colorizer,
        winston.format.printf(
          ({ level, message, timestamp, name, ...other }) => {
            const base = `${timestamp} ${level}: [${
              name || "ROOT"
            }] ${message}`;
            if (Object.keys(other).length) {
              const dump = JSON.stringify(other, null, 2);
              return `${base}\n${colorizer.colorize("data", dump)}`;
            }
            return base;
          }
        )
      ),
    }),
  ],
});
