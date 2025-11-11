import { z } from "zod";

// Composio tool call started
export const zComposioToolCallSchema = z.object({
  type: z.literal("composio-tool-call"),
  id: z.uuid(),
  tool: z.string(),
  userId: z.string(),
  input: z.unknown(),
});

// Composio tool call completed
export const zComposioToolResultSchema = z.object({
  type: z.literal("composio-tool-result"),
  id: z.uuid(),
  successful: z.boolean(),
  error: z.string().nullable(),
  data: z.unknown(),
});

// Composio tool call error
export const zComposioToolErrorSchema = z.object({
  type: z.literal("composio-tool-error"),
  id: z.uuid(),
  error: z.string(),
});

// Auth error (token verification)
export const zAuthErrorSchema = z.object({
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
export const zTrpcRequestSchema = z.object({
  type: z.literal("trpc-request"),
  id: z.uuid(),
  path: z.string(),
  input: z.unknown().optional(),
  auth: z.object({ userId: z.string(), orgId: z.string() }).nullable(),
  requestType: z.enum(["query", "mutation", "subscription"]),
});

// tRPC response
export const zTrpcResponseSchema = z.object({
  type: z.literal("trpc-response"),
  id: z.uuid(),
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

export const zAIGatewayGenerateTextInputSchema = z.object({
  type: z.literal("ai-gateway-generate-text-input"),
  id: z.uuid(),
  prompt: z.string(),
  model: z.string(),
  tools: z.object({ name: z.string(), description: z.string() }).array(),
});

export const zAIGatewayGenerateTextOutputSchema = z.object({
  type: z.literal("ai-gateway-generate-text-output"),
  id: z.uuid(),
  text: z.string(),
});

export const zAIGatewayGenerateTextErrorSchema = z.object({
  type: z.literal("ai-gateway-generate-text-error"),
  id: z.uuid(),
  error: z.string(),
});

export const zAIGatewayGenerateObjectErrorSchema = z.object({
  type: z.literal("ai-gateway-generate-object-error"),
  id: z.uuid(),
  error: z.string(),
});

export const zAIGatewayGenerateObjectInputSchema = z.object({
  type: z.literal("ai-gateway-generate-object-input"),
  id: z.uuid(),
  prompt: z.string(),
  model: z.string(),
});

export const zAIGatewayGenerateObjectOutputSchema = z.object({
  type: z.literal("ai-gateway-generate-object-output"),
  id: z.uuid(),
  object: z.unknown(),
});

export const zConsoleLogEntrySchema = z.object({
  __squash: z.literal(true),
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string(),
  data: z.union([
    zComposioToolCallSchema,
    zComposioToolResultSchema,
    zComposioToolErrorSchema,
    zAuthErrorSchema,
    zTrpcRequestSchema,
    zTrpcResponseSchema,
    zAIGatewayGenerateTextInputSchema,
    zAIGatewayGenerateTextOutputSchema,
    zAIGatewayGenerateTextErrorSchema,
    zAIGatewayGenerateObjectInputSchema,
    zAIGatewayGenerateObjectOutputSchema,
    zAIGatewayGenerateObjectErrorSchema,
  ]),
  package: z.string(),
  version: z.string(),
  timestamp: z.iso.datetime(),
});

export type ComposioToolCallEntry = z.infer<typeof zComposioToolCallSchema>;
export type ComposioToolResultEntry = z.infer<typeof zComposioToolResultSchema>;
export type ComposioToolErrorEntry = z.infer<typeof zComposioToolErrorSchema>;
export type ConsoleLogEntry = z.infer<typeof zConsoleLogEntrySchema>;

export type AIGatewayGenerateTextInputEntry = z.infer<
  typeof zAIGatewayGenerateTextInputSchema
>;
export type AIGatewayGenerateTextOutputEntry = z.infer<
  typeof zAIGatewayGenerateTextOutputSchema
>;
export type AIGatewayGenerateObjectInputEntry = z.infer<
  typeof zAIGatewayGenerateObjectInputSchema
>;
export type AIGatewayGenerateObjectOutputEntry = z.infer<
  typeof zAIGatewayGenerateObjectOutputSchema
>;
