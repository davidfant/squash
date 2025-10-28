import { experimental_createMCPClient } from "@ai-sdk/mcp";
import {
  Composio,
  ComposioError,
  type ToolkitRetrieveResponse,
} from "@composio/core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import camelCase from "lodash.camelcase";
import upperFirst from "lodash.upperfirst";
import { z } from "zod";
import packageJson from "../package.json";
import { blacklistedAuthModes } from "./utils/blacklistedAuthModes";
import { convertSchemaToTypeScript } from "./utils/convertSchemaToTypeScript";

export interface ComposioMcpServerOptions {
  apiKey: string;
  userId: string;
}

const escapeAttribute = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const toolkitToString = (t: ToolkitRetrieveResponse, isConnected: boolean) =>
  [
    `<toolkit slug="${t.slug}">`,
    JSON.stringify({
      name: t.name,
      slug: t.slug,
      description: t.meta.description,
      isConnected: isConnected,
      authSchemes: t.authConfigDetails
        ?.filter((d) => !blacklistedAuthModes.get(t.slug)?.includes(d.mode))
        ?.filter(
          (d) =>
            !d.fields.authConfigCreation.required.length ||
            t.composioManagedAuthSchemes?.includes(d.mode as string)
        )
        .map((d) => ({ name: d.name, mode: d.mode })),
    }),
    `</toolkit>`,
  ].join("\n");

export function registerComposioTools(
  server: McpServer,
  { apiKey, userId }: ComposioMcpServerOptions
) {
  const composio = new Composio({ apiKey });

  composio.experimental.toolRouter.createSession(userId, {
    toolkits: ["gmail", "github"],
  });
  server.registerTool(
    "SearchToolkits",
    {
      title: "Search Composio toolkits",
      description: `
  Extremely fast search toolkits to discover available MCP toolkits that can be
  used to solve a particular problem, user query or complete a task. Usage guidelines:
  
  • Use this toolkits whenever the user wants to integrate a new external app. After connecting to a toolkit, keep coming back to this tool to discover new toolkits.
  • If the user pivots to a different use case in same chat, you MUST call this tool again with the new use case.
  • Specify one or more plain-language use cases to search for toolkits, including the name of the thirdparty app or tool.
  
  Example: User query: "get the most recent hubspot lead and send them a welcome email"
  Search call: { useCases: ["get the most recent hubspot lead", "send an email to someone"] }
  
  Response:
  • The response lists toolkits (apps) and their auth schemes suitable for the task, along with their. To connect to a toolkit, you need to call ConnectToToolkit with the toolkit slug and the auth scheme name.
        `.trim(),
      inputSchema: { useCases: z.string().array() },
    },
    async (args) => {
      const [results, accs] = await Promise.all([
        (async () => {
          const session = await composio.experimental.toolRouter.createSession(
            userId
          );

          const client = await experimental_createMCPClient({
            transport: { type: "http", url: session.url },
          });

          // @ts-expect-error - callTool is not typed
          const mcpToolOutput = await client.callTool({
            name: "COMPOSIO_SEARCH_TOOLS",
            args: { queries: args.useCases.map((u) => ({ use_case: u })) },
          });

          console.log(mcpToolOutput);
          return (
            JSON.parse(mcpToolOutput.content[0].text).data.results as Array<{
              toolkits: string[];
              reasoning: string;
            }>
          ).map((r) => ({
            useCases: args.useCases,
            reasoning: r.reasoning,
            toolkitSlugs: r.toolkits,
          }));
        })(),
        composio.connectedAccounts.list({
          userIds: [userId],
          statuses: ["ACTIVE"],
        }),
      ]);
      const toolkits = await Promise.all(
        [...new Set(results.flatMap((r) => r.toolkitSlugs))].map((s) =>
          composio.toolkits.get(s)
        )
      );

      const text = [
        "<results>",
        JSON.stringify(results, null, 2),
        "</results>",
        ...toolkits.map((t) =>
          toolkitToString(
            t,
            !!accs.items.some((c) => c.toolkit.slug === t.slug)
          )
        ),
      ].join("\n");

      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "ListTools",
    {
      title: "List Composio tools for a toolkit",
      description: `
  List all available MCP callable tools for a given toolkit. Use this tool to know everything about a toolkit's tools.
  
  Response:
  • The response lists all tools for the toolkit, along with their
    tool slug, name, description. 
    
  **Note**: You cannot yet execute the tool with the information provided here. To execute a tool, you need to call GetToolDetails with the tool slug to know the input/output schemas.
        `.trim(),
      inputSchema: { toolkitSlug: z.string(), toolkitName: z.string() },
      // outputSchema: { results: z.any() },
    },
    async (args) => {
      const tools = await composio.tools.getRawComposioTools({
        toolkits: [args.toolkitSlug],
        limit: 9999,
      });

      const text = tools
        .flatMap((tool) => [
          `**${tool.name} (slug: ${tool.slug})**`,
          tool.description?.replace(/\n+/g, " ") ?? "",
        ])
        .join("\n\n");

      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "GetToolDetails",
    {
      title: "Get Composio tool details",
      description: `
  Get the details of a given Composio tool, including its input/output schemas. Use this tool before calling MultiExecuteTool to know the input/output schemas of a tool.

  Provide a one line reason for why you are calling this tool without mentioning input/output schemas, which will be displayed to the user. E.g. 'Figure out how to send email using Gmail'
  
  Response:
  • The response lists the tool's slug, name, description and input/output schemas
        `.trim(),
      inputSchema: { reason: z.string(), toolSlug: z.string() },
    },
    async (args) => {
      const tools = await composio.tools.getRawComposioTools({
        tools: [args.toolSlug],
      });

      const text = tools
        .flatMap((tool) => [
          `**${tool.name} (slug: ${tool.slug})**`,
          tool.description?.replace(/\n+/g, " ") ?? "",

          "<input_schema>",
          convertSchemaToTypeScript(
            {
              ...tool.inputParameters,
              title: `${upperFirst(camelCase(tool.slug))}Input`,
            },
            { comments: false }
          ).definitions,
          "</input_schema>",
          "<output_schema>",
          convertSchemaToTypeScript(
            {
              ...tool.outputParameters?.properties?.data,
              title: `${upperFirst(camelCase(tool.slug))}Output`,
            },
            { comments: false }
          ).definitions,
          "</output_schema>",
        ])
        .join("\n\n");

      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "ConnectToToolkit",
    {
      title: "Start auth flow for a toolkit",
      description: `Create/manage connections to user's toolkits. If SearchTools finds no active connection for a toolkit, call this with the toolkit slug and name of the auth scheme. If you want to change the auth scheme for a toolkit, you can call this tool again with the new auth scheme name, which will delete the existing connection and create a new one. Supports OAuth (default/custom), API Key, Bearer Token, Basic Auth, hybrid, and no-auth. Batch-safe, isolates errors, allows selective re-init, returns per-app results and summary. Default to using the first authScheme of the toolkit returned by SearchTools, unless the user instructions you otherwise or asks for a specific way to authenticate. You must choose one of the authScheme names provided by the SearchTool authSchemes`,
      inputSchema: {
        toolkitSlug: z.string(),
        authSchemeMode: z.enum([
          "OAUTH2",
          "OAUTH1",
          "API_KEY",
          "BASIC",
          "BILLCOM_AUTH",
          "BEARER_TOKEN",
          "GOOGLE_SERVICE_ACCOUNT",
          "NO_AUTH",
          "BASIC_WITH_JWT",
          "CALCOM_AUTH",
          "SERVICE_ACCOUNT",
        ]),
      },
      outputSchema: {
        redirectUrl: z.string(),
        connectRequestId: z.string(),
        toolkit: z.object({
          name: z.string(),
          logoUrl: z.string(),
          authConfigId: z.string(),
        }),
      },
    },
    async ({ toolkitSlug, authSchemeMode }) => {
      const toolkitP = composio.toolkits.get(toolkitSlug);
      const authConfigId = await (async () => {
        const existing = await composio.authConfigs
          .list({
            toolkit: toolkitSlug,
          })
          .then((res) => res.items[0]!);
        if (existing?.authScheme === authSchemeMode) {
          return existing.id;
        }
        if (existing) {
          await composio.authConfigs.delete(existing.id);
        }

        const toolkit = await toolkitP;
        const created = await composio.authConfigs.create(
          toolkitSlug,
          toolkit.composioManagedAuthSchemes?.includes(authSchemeMode)
            ? { type: "use_composio_managed_auth" }
            : {
                type: "use_custom_auth",
                authScheme: authSchemeMode,
                credentials: {},
              }
        );
        return created.id;
      })();

      const link = await composio.connectedAccounts.link(userId, authConfigId);
      const toolkit = await toolkitP;
      const payload = {
        toolkit: {
          name: toolkit.name,
          logoUrl: toolkit.meta.logo,
          authConfigId: authConfigId,
        },
        connectRequestId: link.id,
        redirectUrl: link.redirectUrl,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }
  );

  server.registerTool(
    "WaitForConnection",
    {
      title: "Wait for a connection to be established",
      description: `Wait for a connection to be established for a toolkit. You MUST call this tool immediately after calling ConnectToToolkit, and cannot call it any other time.`,
      inputSchema: { connectRequestId: z.string() },
      outputSchema: { isConnected: z.boolean(), reason: z.string().nullable() },
    },
    async ({ connectRequestId }) => {
      const res = await composio.connectedAccounts.waitForConnection(
        connectRequestId,
        120000
      );
      const data = {
        isConnected: res.status === "ACTIVE",
        reason: res.statusReason,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data,
      };
    }
  );

  server.registerTool(
    "CheckConnectionStatus",
    {
      title: "Check connection status for a toolkit",
      description: `After a user has connected to a toolkit, call this tool to check if they are connected to a toolkit before using it. If when searching for tools, you find that a tool is already connected, you can skip this step.`,
      inputSchema: { toolkitSlug: z.string() },
      outputSchema: { isConnected: z.boolean() },
    },
    async ({ toolkitSlug }) => {
      const resp = await composio.connectedAccounts.list({
        userIds: [userId],
        toolkitSlugs: [toolkitSlug],
        statuses: ["ACTIVE"],
      });
      const data = { isConnected: !!resp.items.length };
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data,
      };
    }
  );

  server.registerTool(
    "ListConnectedToolkits",
    {
      title: "List all connected toolkits",
      description: `
  Retrieves all connected toolkits for the user. This is useful when you want to see what toolkits are already connected to the user without needing to search for specific use cases.
  
  Response:
  • Lists all tools from connected toolkits with their slug, name, description, and TypeScript input/output schemas.
  • Tools are ready to be executed via \`MultiExecuteTool\` without requiring additional authentication.
      `.trim(),
      inputSchema: {},
    },
    async () => {
      // Get all connected accounts for the user
      const connectedAccounts = await composio.connectedAccounts.list({
        userIds: [userId],
        statuses: ["ACTIVE"],
      });

      const toolkits = await Promise.all(
        [...new Set(connectedAccounts.items.map((c) => c.toolkit.slug))].map(
          (slug) => composio.toolkits.get(slug)
        )
      );
      const text = toolkits.map((t) => toolkitToString(t, true)).join("\n");

      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "MultiExecuteTool",
    {
      title: "Execute a multi-step tool",
      description: `
  **Fast and parallel tool executor for tools discovered through \`SearchTools\`.**
  Use this tool to execute up to 20 tools in parallel across apps. Response contains structured outputs ready for immediate analysis.
  
  ### Prerequisites:
  
  * Always use valid tool slugs and their parameters discovered through \`SearchTools\` or \`GetConnectedTools\`. You CANNOT make up tool slugs and can only ever reference Composio tool slugs that have been discovered through previous tool calls.
  * Before executing a tool, make sure you have an active connection with the toolkit. If no active connection exists, call \`ConnectToToolkit\` to create one.
  * Ensure that the tools you are executing do not have any dependencies on each other.
  
  ### Usage guidelines:
  
  * To be used whenever a tool is discovered and has to be called, either as part of a multi-step workflow or as a standalone tool.
  * If \`SearchTools\` or \`GetConnectedTools\` returns a tool that can perform the task, prefer calling it via this executor. Do not write custom API calls or ad-hoc scripts for tasks that can be completed by available Composio tools.
  * Tools should be used highly parallelly.
      `.trim(),
      inputSchema: {
        toolCalls: z.array(
          z.object({
            toolSlug: z.string(),
            reason: z
              .string()
              .describe(
                "Brief explanation of the tool call, e.g. 'Send an email to John welcoming him'"
              ),
            arguments: z.record(z.string(), z.any()),
          })
        ),
      },
    },
    async ({ toolCalls }) => {
      const results = await Promise.all(
        toolCalls.map(async (tc) => {
          try {
            const r = await composio.tools.execute(tc.toolSlug, {
              userId: userId,
              arguments: tc.arguments,
            });
            return {
              toolSlug: tc.toolSlug,
              result: {
                successful: r.successful,
                error: r.error,
                data: r.data,
              },
            };
          } catch (e) {
            const error =
              e instanceof ComposioError
                ? [e.message, e.cause, ...(e.possibleFixes ?? [])]
                    .filter((s) => !!s)
                    .join("\n")
                : e instanceof Error
                ? e.message
                : String(e);
            return {
              toolSlug: tc.toolSlug,
              result: { successful: false, error: error, data: null },
            };
          }
        })
      );

      const TOTAL_CHAR_BUDGET = 50_000;
      const perCallBudget = Math.floor(TOTAL_CHAR_BUDGET / toolCalls.length);

      const indentBlock = (text: string, spaces = 6): string => {
        const prefix = " ".repeat(spaces);
        return text
          .split("\n")
          .map((line) => `${prefix}${line}`)
          .join("\n");
      };

      const summaries = results
        .map((res, index) => {
          const errorValue =
            res.result.error === null || res.result.error === undefined
              ? "null"
              : typeof res.result.error === "string"
              ? res.result.error
              : JSON.stringify(res.result.error);
          return `    <result slug="${
            res.toolSlug
          }" index="${index}" successful="${Boolean(
            res.result.successful
          )}" error="${escapeAttribute(errorValue)}"/>`;
        })
        .join("\n");

      const details = results
        .map((res, index) => {
          const data = JSON.stringify(res.result.data);
          const visibleChars = Math.min(perCallBudget, data.length);
          const visibleData = data.slice(0, visibleChars);
          const truncated =
            visibleChars < data.length
              ? `${Math.round(
                  (visibleChars / data.length) * 100
                )}% of the data visible (${visibleChars} of ${
                  data.length
                } chars)`
              : "false";
          const body = indentBlock(visibleData || "");

          return [
            `    <resultDetail slug="${res.toolSlug}" index="${index}" truncated="${truncated}">`,
            body,
            `    </resultDetail>`,
          ].join("\n");
        })
        .join("\n\n");

      const text = [
        `<results>`,
        `  <summaries>`,
        summaries,
        `  </summaries>`,
        ``,
        `  <details>`,
        details,
        `  </details>`,
        `</results>`,
      ].join("\n");

      return { content: [{ type: "text", text }] };
    }
  );
}

export function createComposioMcpServer(
  options: ComposioMcpServerOptions
): McpServer {
  const server = new McpServer({
    name: "Composio",
    version: packageJson.version,
  });
  registerComposioTools(server, options);
  return server;
}
