export default {
  async fetch(req: Request, env: CloudflareBindings): Promise<Response> {
    const root = env.PREVIEW_ROOT;
    const { host } = new URL(req.url);

    if (!host.endsWith(root)) {
      return new Response("Bad host", { status: 400 });
    }

    const previewId = host.slice(0, -root.length);
    const legal = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!legal.test(previewId)) {
      return new Response("Unknown preview", { status: 404 });
    }

    const upstream = new URL(req.url);
    upstream.hostname = `${previewId}.fly.dev`;
    upstream.port = "";

    if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
      return fetch(upstream, req);
    }

    const init: RequestInit = {
      method: req.method,
      headers: new Headers(req.headers),
      body: req.body,
      redirect: "follow",
    };

    return fetch(upstream, init);
  },
};
