import { Composio } from "@composio/core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import camelCase from "lodash.camelcase";
import upperFirst from "lodash.upperfirst";
import { z } from "zod";
import { convertSchemaToTypeScript } from "../../lib/convert-schema-to-typescript";

const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY! });

/**
 * 1  Create the server skeleton
 */
const server = new McpServer({ name: "composio", version: "1.0.0" });

/**
 * 2  Register tools
 */
server.registerTool(
  "search_tools",
  {
    title: "Search Composio tools",
    description: `
Extremely fast search tool to discover available MCP callable tools that can be
used to solve a particular problem, user query or complete a task. Usage guidelines:

• Use this tool whenever the user wants to integrate a new external app. Post this, keep coming back to this tool to discover new tools.
• If the user pivots to a different use case in same chat, you MUST call this tool again with the new use case.
• Specify the use_case with a normalized description of the problem, query, or task.
  Be clear and precise so the system can find the most relevant tools. Queries can
  involve one or multiple apps, and be simple or complex — from a quick action to a
  multi-step, cross-app workflow.

Example: User query: "send an email to John welcoming him"
Search call: { use_case: "send an email to someone" }

Response:

• The response lists toolkits (apps) and tools suitable for the task, along with their
  tool_slug, description, input schema, and related tools for prerequisites, alternatives,
  or next steps. Includes execution order and a brief reasoning.
      `.trim(),
    inputSchema: { use_case: z.string() },
    // outputSchema: { results: z.any() },
  },
  async (args) => {
    const tools = await composio.tools.getRawComposioTools({
      search: args.use_case,
    });
    const resp = await composio.connectedAccounts.list({
      userIds: [process.env.COMPOSIO_PLAYGROUND_USER_ID!],
      statuses: ["ACTIVE"],
    });

    const text = tools
      // .slice(0, 10)
      .map((tool) =>
        [
          `<${tool.slug} name="${tool.name}">`,
          `**Connection Status:** ${
            resp.items.some((c) => c.toolkit.slug === tool.toolkit?.slug)
              ? "Connected"
              : "Not connected"
          }`,
          tool.description?.replace(/\n+/g, " ") ?? "",
          "",
          `**Toolkit:** ${tool.toolkit?.name} \`(${tool.toolkit?.slug})\``,
          tool.scopes?.length
            ? `**Scopes:** ${tool.scopes
                .map((s: string) => "`" + s + "`")
                .join(", ")}`
            : "N/A",
          "",
          "```ts",
          "```",
          `</${tool.slug}>`,
        ].join("\n")
      )
      .join("\n---\n");

    return { content: [{ type: "text", text }] };
  }
);

server.registerTool(
  "connect_to_toolkit",
  {
    title: "Start auth flow for a toolkit",
    description: `Create/manage connections to user's toolkits. If search_tools finds no active connection for a toolkit, call this with the toolkit slug and get auth redirect_url in response. Supports OAuth (default/custom), API Key, Bearer Token, Basic Auth, hybrid, and no-auth. Batch-safe, isolates errors, allows selective re-init, returns per-app results and summary.`,
    inputSchema: { toolkit_slug: z.string() },
    outputSchema: { redirect_url: z.string(), connect_request_id: z.string() },
  },
  async ({ toolkit_slug }) => {
    const authConfigId = await (async () => {
      const existing = await composio.authConfigs.list({
        toolkit: toolkit_slug,
      });
      if (existing.items.length) return existing.items[0]!.id;

      const created = await composio.authConfigs.create(toolkit_slug, {
        type: "use_composio_managed_auth",
      });

      return created.id;
    })();

    const link = await composio.connectedAccounts.link(
      process.env.COMPOSIO_PLAYGROUND_USER_ID!,
      authConfigId
    );
    const payload = {
      connect_request_id: link.id,
      redirect_url: link.redirectUrl,
      auth_config_id: authConfigId,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  }
);

server.registerTool(
  "check_connection_status",
  {
    title: "Check connection status for a toolkit",
    description: `After a user has connected to a toolkit, call this tool to check if they are connected to a toolkit before using it. If when searching for tools, you find that a tool is already connected, you can skip this step.`,
    inputSchema: { toolkit_slug: z.string() },
    outputSchema: { is_connected: z.boolean() },
  },
  async ({ toolkit_slug }) => {
    const resp = await composio.connectedAccounts.list({
      userIds: [process.env.COMPOSIO_PLAYGROUND_USER_ID!],
      toolkitSlugs: [toolkit_slug],
      statuses: ["ACTIVE"],
    });
    const data = { is_connected: !!resp.items.length };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
    };
  }
);

server.registerTool(
  "get_connected_tools",
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
  "multi_execute_tool",
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
      tool_calls: z.array(
        z.object({
          tool_slug: z.string(),
          arguments: z.record(z.string(), z.any()),
        })
      ),
    },
    outputSchema: {
      results: z.array(z.object({ tool_slug: z.string(), result: z.any() })),
    },
  },
  async ({ tool_calls }) => {
    const results = await Promise.all(
      tool_calls.map(async (tc) => {
        const result = await composio.tools.execute(tc.tool_slug, {
          userId: process.env.COMPOSIO_PLAYGROUND_USER_ID!,
          arguments: tc.arguments,
        });
        return {
          tool_slug: tc.tool_slug,
          result: {
            successful: result.successful,
            error: result.error,
            data: result.data,
          },
        };
      })
    );

    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      structuredContent: { results },
    };
  }
);

/**
 * 3  Wire up stdio transport
 *
 * NOTE: never write to stdout – use stderr for logs
 *       (see MCP server logging rules).:contentReference[oaicite:0]{index=0}
 */

(async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport); // blocks forever
})().catch((err) => {
  console.error("fatal error:", err); // stderr is safe
  process.exit(1);
});
