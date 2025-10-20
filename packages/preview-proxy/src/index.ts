export default {
  async fetch(req: Request, env: CloudflareBindings): Promise<Response> {
    const root = env.PREVIEW_ROOT;
    const { host } = new URL(req.url);

    // console.log(`[${req.method}] ${req.url}`, req.headers);

    if (!host.endsWith(root)) {
      return new Response("Bad host", { status: 400 });
    }

    const previewId = host.slice(0, -root.length);
    const legal = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!legal.test(previewId)) {
      return new Response("Unknown preview", { status: 404 });
    }

    const upstreamURL = new URL(req.url);
    upstreamURL.protocol = "https:";
    upstreamURL.hostname = `${previewId}.proxy.daytona.works`;
    // upstream.hostname = previewId.replaceAll("---", ".");
    upstreamURL.port = "";

    const upstreamHeaders = new Headers(req.headers);
    upstreamHeaders.set("X-Daytona-Skip-Preview-Warning", "true");
    upstreamHeaders.set("X-Daytona-Disable-CORS", "true");

    if (req.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      return fetch(upstreamURL, {
        method: req.method,
        headers: upstreamHeaders,
        body: req.body,
      });
    }

    const res = await fetch(upstreamURL, {
      method: req.method,
      headers: upstreamHeaders,
      body: req.body,
      redirect: "follow",
      cache: "no-store",
    });

    const resHeaders = new Headers(res.headers);
    resHeaders.set("Cache-Control", "no-store");
    resHeaders.set("Pragma", "no-cache");
    resHeaders.set("Expires", "0");

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
    });
  },
};
