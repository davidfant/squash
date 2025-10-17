import type {
  JSONValue,
  LanguageModelV2FinishReason,
  LanguageModelV2StreamPart,
  LanguageModelV2Usage,
  SharedV2ProviderMetadata,
} from "@ai-sdk/provider";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { generateId } from "ai";
import { mapAnthropicStopReason } from "./map-stop-reason";

interface AnthropicReasoningMetadata {
  signature?: string;
  redactedData?: string;
}

interface AnthropicProviderMetadata extends SharedV2ProviderMetadata {
  usage: Record<string, JSONValue>;
}

const toToolName = (name: string) => `ClaudeCode${name}`;

export function messageToStreamPart(
  controller: ReadableStreamDefaultController<LanguageModelV2StreamPart>
) {
  const usesJsonResponseTool = false;
  const contentBlocks: Array<
    | { type: "text" }
    | { type: "reasoning" }
    | { type: "tool-call"; toolCallId: string; toolName: string; input: string }
  > = [];

  const usage: LanguageModelV2Usage = {
    inputTokens: undefined,
    outputTokens: undefined,
    totalTokens: undefined,
  };
  let finishReason: LanguageModelV2FinishReason = "unknown";
  let providerMetadata: AnthropicProviderMetadata | undefined = undefined;
  let subagents = new Set<string>();

  return (m: SDKMessage) => {
    if (m.type === "user") {
      if (Array.isArray(m.message.content)) {
        for (const part of m.message.content) {
          switch (part.type) {
            case "tool_result": {
              const tc = contentBlocks
                .filter((cb) => cb.type === "tool-call")
                .find((cb) => cb.toolCallId === part.tool_use_id);
              controller.enqueue({
                type: "tool-result",
                toolCallId: part.tool_use_id,
                toolName: tc?.toolName ?? "unknown",
                result: part.content,
                providerExecuted: true,
              });
            }
          }
        }
      }
    } else if (m.type === "stream_event") {
      const value = m.event;
      switch (value.type) {
        case "ping": {
          return; // ignored
        }

        case "content_block_start": {
          switch (value.content_block.type) {
            case "text": {
              contentBlocks[value.index] = { type: "text" };
              controller.enqueue({
                type: "text-start",
                id: String(value.index),
              });
              return;
            }

            case "thinking": {
              contentBlocks[value.index] = { type: "reasoning" };
              controller.enqueue({
                type: "reasoning-start",
                id: String(value.index),
              });
              return;
            }

            case "redacted_thinking": {
              contentBlocks[value.index] = { type: "reasoning" };
              controller.enqueue({
                type: "reasoning-start",
                id: String(value.index),
                providerMetadata: {
                  anthropic: {
                    redactedData: value.content_block.data,
                  } satisfies AnthropicReasoningMetadata,
                },
              });
              return;
            }

            case "tool_use": {
              contentBlocks[value.index] = usesJsonResponseTool
                ? { type: "text" }
                : {
                    type: "tool-call",
                    toolCallId: value.content_block.id,
                    toolName: toToolName(value.content_block.name),
                    input: "",
                  };

              controller.enqueue(
                usesJsonResponseTool
                  ? { type: "text-start", id: String(value.index) }
                  : {
                      type: "tool-input-start",
                      id: value.content_block.id,
                      toolName: toToolName(value.content_block.name),
                    }
              );
              if (value.content_block.name === "Task") {
                console.log("XXX SUBAGENTS ADD", value.content_block.id);
                subagents.add(value.content_block.id);
              }
              return;
            }

            case "server_tool_use": {
              if (
                value.content_block.name === "web_search" ||
                value.content_block.name === "code_execution"
              ) {
                contentBlocks[value.index] = {
                  type: "tool-call",
                  toolCallId: value.content_block.id,
                  toolName: toToolName(value.content_block.name),
                  input: "",
                  // providerExecuted: true,
                };
                controller.enqueue({
                  type: "tool-input-start",
                  id: value.content_block.id,
                  toolName: toToolName(value.content_block.name),
                  providerExecuted: true,
                });
              }

              return;
            }

            case "web_search_tool_result": {
              const part = value.content_block;

              if (Array.isArray(part.content)) {
                controller.enqueue({
                  type: "tool-result",
                  toolCallId: part.tool_use_id,
                  toolName: "web_search",
                  result: part.content.map((result: any) => ({
                    url: result.url,
                    title: result.title,
                    pageAge: result.page_age ?? null,
                    encryptedContent: result.encrypted_content,
                    type: result.type,
                  })),
                  providerExecuted: true,
                });

                for (const result of part.content) {
                  controller.enqueue({
                    type: "source",
                    sourceType: "url",
                    id: generateId(),
                    url: result.url,
                    title: result.title,
                    providerMetadata: {
                      anthropic: {
                        pageAge: result.page_age ?? null,
                      },
                    },
                  });
                }
              } else {
                controller.enqueue({
                  type: "tool-result",
                  toolCallId: part.tool_use_id,
                  toolName: "web_search",
                  isError: true,
                  result: {
                    type: "web_search_tool_result_error",
                    errorCode: part.content.error_code,
                  },
                  providerExecuted: true,
                });
              }
              return;
            }

            case "code_execution_tool_result": {
              const part = value.content_block;

              if (part.content.type === "code_execution_result") {
                controller.enqueue({
                  type: "tool-result",
                  toolCallId: part.tool_use_id,
                  toolName: "code_execution",
                  result: {
                    type: part.content.type,
                    stdout: part.content.stdout,
                    stderr: part.content.stderr,
                    return_code: part.content.return_code,
                  },
                  providerExecuted: true,
                });
              } else if (
                part.content.type === "code_execution_tool_result_error"
              ) {
                controller.enqueue({
                  type: "tool-result",
                  toolCallId: part.tool_use_id,
                  toolName: "code_execution",
                  isError: true,
                  result: {
                    type: "code_execution_tool_result_error",
                    errorCode: part.content.error_code,
                  },
                  providerExecuted: true,
                });
              }

              return;
            }

            default: {
              throw new Error(
                `Unsupported content block type: ${value.content_block.type}`
              );
            }
          }
        }

        case "content_block_stop": {
          // when finishing a tool call block, send the full tool call:
          const contentBlock = contentBlocks[value.index];
          if (contentBlock) {
            switch (contentBlock.type) {
              case "text": {
                controller.enqueue({
                  type: "text-end",
                  id: String(value.index),
                });
                break;
              }

              case "reasoning": {
                controller.enqueue({
                  type: "reasoning-end",
                  id: String(value.index),
                });
                break;
              }

              case "tool-call":
                // when a json response tool is used, the tool call is returned as text,
                // so we ignore the tool call content:
                if (!usesJsonResponseTool) {
                  controller.enqueue({
                    type: "tool-input-end",
                    id: contentBlock.toolCallId,
                  });
                  controller.enqueue(contentBlock);
                }
                break;
            }
          }

          return;
        }

        case "content_block_delta": {
          const deltaType = value.delta.type;
          switch (deltaType) {
            case "text_delta": {
              // when a json response tool is used, the tool call is returned as text,
              // so we ignore the text content:
              if (usesJsonResponseTool) return;

              controller.enqueue({
                type: "text-delta",
                id: String(value.index),
                delta: value.delta.text,
              });

              return;
            }

            case "thinking_delta": {
              controller.enqueue({
                type: "reasoning-delta",
                id: String(value.index),
                delta: value.delta.thinking,
              });

              return;
            }

            // case "signature_delta": {
            //   // signature are only supported on thinking blocks:
            //   if (blockType === "thinking") {
            //     controller.enqueue({
            //       type: "reasoning-delta",
            //       id: String(value.index),
            //       delta: "",
            //       providerMetadata: {
            //         anthropic: {
            //           signature: value.delta.signature,
            //         } satisfies AnthropicReasoningMetadata,
            //       },
            //     });
            //   }

            //   return;
            // }

            case "input_json_delta": {
              const contentBlock = contentBlocks[value.index];
              const delta = value.delta.partial_json;

              if (usesJsonResponseTool) {
                if (contentBlock?.type !== "text") {
                  return;
                }

                controller.enqueue({
                  type: "text-delta",
                  id: String(value.index),
                  delta,
                });
              } else {
                if (contentBlock?.type !== "tool-call") {
                  return;
                }

                controller.enqueue({
                  type: "tool-input-delta",
                  id: contentBlock.toolCallId,
                  delta,
                });

                contentBlock.input += delta;
              }

              return;
            }

            // case "citations_delta": {
            //   const citation = value.delta.citation;

            //   processCitation(citation, citationDocuments, generateId, (source) =>
            //     controller.enqueue(source)
            //   );
            //   // Web search citations are handled in web_search_tool_result content block
            //   return;
            // }

            default:
              console.warn(`Unsupported delta type`, deltaType);
          }
        }

        case "message_start": {
          usage.inputTokens = value.message.usage.input_tokens;
          usage.cachedInputTokens =
            value.message.usage.cache_read_input_tokens ?? undefined;

          providerMetadata = {
            usage: value.message.usage,
            cacheCreationInputTokens:
              value.message.usage.cache_creation_input_tokens ?? null,
          };

          controller.enqueue({
            type: "response-metadata",
            id: value.message.id ?? undefined,
            modelId: value.message.model ?? undefined,
          });

          return;
        }

        case "message_delta": {
          usage.outputTokens = value.usage.output_tokens;
          usage.totalTokens =
            (usage.inputTokens ?? 0) + (value.usage.output_tokens ?? 0);

          finishReason = mapAnthropicStopReason({
            finishReason: value.delta.stop_reason,
            isJsonResponseFromTool: usesJsonResponseTool,
          });
          return;
        }

        case "message_stop": {
          console.log("XXX MESSAGE STOP", m.parent_tool_use_id, subagents);
          if (m.parent_tool_use_id) {
            subagents.delete(m.parent_tool_use_id);
          } else if (!subagents.size) {
            controller.enqueue({
              type: "finish",
              finishReason,
              usage,
              providerMetadata,
            });
            usage.inputTokens = undefined;
            usage.outputTokens = undefined;
            usage.totalTokens = undefined;
          }
          return;
        }

        case "error": {
          controller.enqueue({ type: "error", error: value.error });
          return;
        }

        default: {
          throw new Error(`Unsupported chunk type: ${value}`);
        }
      }
    }
  };
}
