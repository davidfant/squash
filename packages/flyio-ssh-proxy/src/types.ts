import { z } from "zod";

export const jwtPayloadSchema = z.object({
  app: z.string(),
  cwd: z.string(),
});

export type JWTPayload = z.infer<typeof jwtPayloadSchema>;

export namespace Event {
  export interface Start {
    type: "start";
    timestamp: string;
  }
  export interface Stdout {
    type: "stdout";
    data: string;
    timestamp: string;
  }
  export interface Stderr {
    type: "stderr";
    data: string;
    timestamp: string;
  }
  export interface Complete {
    type: "complete";
    timestamp: string;
  }
  export interface Error {
    type: "error";
    error: string;
    timestamp: string;
  }
  export type Any = Start | Stdout | Stderr | Complete | Error;
}
