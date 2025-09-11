import * as ai from "ai";
import { Client } from "langsmith";
import { wrapAISDK } from "langsmith/experimental/vercel";

export const langsmith = new Client();

export const { generateText, streamText, generateObject, streamObject } =
  wrapAISDK(ai, { client: langsmith });
