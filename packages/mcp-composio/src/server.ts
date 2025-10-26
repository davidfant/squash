import { Composio } from "@composio/core";
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

export function registerComposioTools(
  server: McpServer,
  { apiKey, userId }: ComposioMcpServerOptions
) {
  const composio = new Composio({ apiKey });

  server.registerTool(
    "SearchTools",
    {
      title: "Search Composio tools",
      description: `
  Extremely fast search tool to discover available MCP callable tools that can be
  used to solve a particular problem, user query or complete a task. Usage guidelines:
  
  • Use this tool whenever the user wants to integrate a new external app. Post this, keep coming back to this tool to discover new tools.
  • If the user pivots to a different use case in same chat, you MUST call this tool again with the new use case.
  • Specify keywords to search for tools, including the name of the thirdparty app or tool.
  
  Example: User query: "send an email to John welcoming him"
  Search call: { keywords: "send email" }
  
  Response:
  
  • The response lists tools suitable for the task, along with their
    tool slug, name and description
  • The response also lists toolkits (apps) and their auth schemes suitable for the task, along with their. To connect to a toolkit, you need to call ConnectToToolkit with the toolkit slug and the auth scheme name.
        `.trim(),
      inputSchema: { keywords: z.string() },
      // outputSchema: { results: z.any() },
    },
    async (args) => {
      const [tools, accs] = await Promise.all([
        composio.tools.getRawComposioTools({
          search: args.keywords,
        }),
        composio.connectedAccounts.list({
          userIds: [userId],
          statuses: ["ACTIVE"],
        }),
      ]);
      const toolkits = await Promise.all(
        [...new Set(tools.map((t) => t.toolkit?.slug ?? ""))].map((s) =>
          composio.toolkits.get(s)
        )
      );

      const text = [
        "<tools>",
        ...tools.map((tool) =>
          [
            `<tool slug="${tool.slug}">`,
            JSON.stringify(
              {
                slug: tool.slug,
                name: tool.name,
                scopes: tool.scopes,
                toolkitSlug: tool.toolkit?.slug,
              },
              null,
              2
            ),
            `</tool>`,
          ].join("\n")
        ),
        "</tools>",
        "<toolkits>",
        ...toolkits.map((t) =>
          [
            `<toolkit slug="${t.slug}">`,
            JSON.stringify(
              {
                name: t.name,
                slug: t.slug,
                isConnected: !!accs.items.some(
                  (c) => c.toolkit.slug === t.slug
                ),
                authSchemes: t.authConfigDetails
                  ?.filter(
                    (d) =>
                      !blacklistedAuthModes
                        .get(t.slug)
                        ?.includes(d.mode as string)
                  )
                  ?.filter(
                    (d) =>
                      !d.fields.authConfigCreation.required.length ||
                      t.composioManagedAuthSchemes?.includes(d.mode as string)
                  )
                  .map((d) => ({ name: d.name, mode: d.mode })),
              },
              null,
              2
            ),
            `</toolkit>`,
          ].join("\n")
        ),
        "</toolkits>",
      ].join("\n");

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
        userIds: [process.env.COMPOSIO_PLAYGROUND_USER_ID!],
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
    "GetConnectedTools",
    {
      title: "Get all tools from connected toolkits",
      description: `
  Retrieves all available tools from the user's connected toolkits. This is useful when you want to see what tools are already available to use without needing to search for specific use cases.
  
  Response:
  • Lists all tools from connected toolkits with their slug, name, description, and TypeScript input/output schemas.
  • Tools are ready to be executed via \`multi_execute_tool\` without requiring additional authentication.
      `.trim(),
      inputSchema: {},
    },
    async () => {
      // Get all connected accounts for the user
      const connectedAccounts = await composio.connectedAccounts.list({
        userIds: [process.env.COMPOSIO_PLAYGROUND_USER_ID!],
        statuses: ["ACTIVE"],
      });

      // Extract unique toolkit slugs from connected accounts
      const connectedToolkitSlugs = [
        ...new Set(connectedAccounts.items.map((c) => c.toolkit.slug)),
      ];

      // Get all tools for connected toolkits
      const allTools = await Promise.all(
        connectedToolkitSlugs.map((slug) =>
          composio.tools.getRawComposioTools({ toolkits: [slug] })
        )
      );

      // Flatten the array of tool arrays
      const tools = allTools.flat();

      // Format tools similar to search_tools
      const text = tools
        .map((tool) =>
          [
            `<${tool.slug} name="${tool.name}">`,
            tool.description?.replace(/\n+/g, " ") ?? "",
            "",
            "<input_schema>",
            convertSchemaToTypeScript(
              {
                ...tool.inputParameters,
                title: `${upperFirst(camelCase(tool.slug))}Input`,
              },
              { comments: false }
            ).definitions,
            "/<input_schema>",
            "<output_schema>",
            convertSchemaToTypeScript(
              {
                ...tool.outputParameters,
                title: `${upperFirst(camelCase(tool.slug))}Output`,
              },
              { comments: false }
            ).definitions,
            "</output_schema>",
            `</${tool.slug}>`,
          ].join("\n")
        )
        .join("\n---\n");

      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "MultiExecuteTool",
    {
      title: "Execute a multi-step tool",
      description: `
  **Fast and parallel tool executor for tools discovered through \`search_tools\`.**
  Use this tool to execute up to 20 tools in parallel across apps. Response contains structured outputs ready for immediate analysis.
  
  ### Prerequisites:
  
  * Always use valid tool slugs and their parameters discovered through \`search_tools\`.
    **NEVER** invent tool slugs. **ALWAYS** pass arguments with the \`tool_slug\` in each tool.
  * Before executing a tool, make sure you have an active connection with the toolkit. If no active connection exists, call \`connect_to_toolkit\` to create one.
  * Ensure that the tools you are executing do not have any dependencies on each other.
  
  ### Usage guidelines:
  
  * To be used whenever a tool is discovered and has to be called, either as part of a multi-step workflow or as a standalone tool.
  * If \`search_tools\` returns a tool that can perform the task, prefer calling it via this executor.
    Do not write custom API calls or ad-hoc scripts for tasks that can be completed by available Composio tools.
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
      outputSchema: {
        results: z.array(z.object({ toolSlug: z.string(), result: z.any() })),
      },
    },
    async ({ toolCalls }) => {
      const results = await Promise.all(
        toolCalls.map(async (tc) => {
          const r = await composio.tools.execute(tc.toolSlug, {
            userId: process.env.COMPOSIO_PLAYGROUND_USER_ID!,
            arguments: tc.arguments,
          });
          return {
            toolSlug: tc.toolSlug,
            result: { successful: r.successful, error: r.error, data: r.data },
          };
        })
      );

      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        structuredContent: { results },
      };
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
