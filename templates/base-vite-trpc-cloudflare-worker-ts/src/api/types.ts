import { z } from "zod";

// Logger data schemas

// Composio tool call started
export const composioToolCallStartedSchema = z.object({
  type: z.literal("composio-tool-call"),
  id: z.string().uuid(),
  tool: z.string(),
  userId: z.string(),
  input: z.unknown(),
});

// Composio tool call completed
export const composioToolCallCompletedSchema = z.object({
  type: z.literal("composio-tool-result"),
  id: z.string().uuid(),
  successful: z.boolean(),
  error: z.string().nullable(),
  data: z.unknown(),
});

// Composio tool call error
export const composioToolCallErrorSchema = z.object({
  type: z.literal("composio-tool-error"),
  id: z.string().uuid(),
  error: z.string(),
});

// Auth error (token verification)
export const authErrorSchema = z.object({
  type: z.literal("auth-error"),
  token: z.string(),
  error: z.object({
    name: z.string().optional(),
    message: z.string().optional(),
    stack: z.string().optional(),
    cause: z.unknown().optional(),
    code: z.string().optional(),
  }),
});

// tRPC request
export const trpcRequestSchema = z.object({
  type: z.literal("trpc-request"),
  id: z.string().uuid(),
  path: z.string(),
  input: z.unknown(),
  auth: z
    .object({
      userId: z.string(),
      orgId: z.string(),
    })
    .nullable(),
  requestType: z.string(),
});

// tRPC response
export const trpcResponseSchema = z.object({
  type: z.literal("trpc-response"),
  id: z.string().uuid(),
  duration: z.number(),
  ok: z.boolean(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      stack: z.string().optional(),
    })
    .optional(),
  data: z.unknown().optional(),
});
