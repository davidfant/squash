export default {
  async fetch(request: Request, env: CloudflareBindings): Promise<Response> {
    const host = request.headers.get("Host")?.toLowerCase();
    if (!host) return new Response("Bad origin", { status: 400 });

    const prefix = await env.DOMAIN_MAPPINGS.get(host, "text");
    if (!prefix) return new Response("Unknown site", { status: 404 });

    if (!/^[a-z0-9_\-/]+$/i.test(prefix)) {
      return new Response("Misconfigured prefix", { status: 500 });
    }

    const { pathname } = new URL(request.url);
    const cleanPath = pathname.replace(/^\/+/, "");

    const keys: string[] = [];

    if (pathname.endsWith("/")) {
      keys.push(`${prefix}/${cleanPath}index.html`);
    } else if (cleanPath === "") {
      keys.push(`${prefix}/index.html`);
    } else {
      keys.push(`${prefix}/${cleanPath}`);
      keys.push(`${prefix}/${cleanPath}/index.html`);
      if (!cleanPath.includes(".")) {
        keys.push(`${prefix}/${cleanPath}.html`);
      }
    }

    let object: R2ObjectBody | null = null;
    for (const key of keys) {
      object = await env.DEPLOYMENTS.get(key);
      if (object) break;
    }
    if (!object) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set(
      "Cache-Control",
      "no-cache, must-revalidate, max-age=0, stale-while-revalidate=30"
    );
    headers.set("Cloudflare-CDN-Cache-Control", "max-age=60");
    headers.set("Cache-Tag", host);
    console.log("headers", headers);
    return new Response(object.body, { headers });
  },
};
