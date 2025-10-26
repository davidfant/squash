import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import {
  createComposioMcpServer,
  type ComposioMcpServerOptions,
} from "./server";

export class ComposioMcpAgent extends McpAgent<
  {},
  unknown,
  Record<string, unknown> & ComposioMcpServerOptions
> {
  override server!: Promise<McpServer>;

  override async init() {
    if (!this.props) {
      throw new Error("Composio MCP props were not provided to the agent");
    }

    this.server = Promise.resolve(createComposioMcpServer(this.props));
    await this.server;
  }
}

export default {
  async fetch(request: Request, env: {}, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    if (!["/sse", "/sse/message", "/mcp"].includes(url.pathname)) {
      return new Response("Not found", { status: 404 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": request.headers.get("Origin") ?? "*",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      return new Response("Unauthorized", { status: 401 });
    }

    const [apiKey, userId] = token.split(":");
    if (!apiKey || !userId) {
      return new Response("Server configuration error", { status: 500 });
    }

    // @ts-expect-error - ctx.props is not readonly
    ctx.props = {
      apiKey,
      userId,
    } satisfies ComposioMcpServerOptions;

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return ComposioMcpAgent.serveSSE("/sse").fetch(request, env, ctx);
    }

    return ComposioMcpAgent.serve("/mcp").fetch(request, env, ctx);
  },
};
