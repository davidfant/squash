import puppeteer from "@cloudflare/puppeteer";
import { randomUUID } from "crypto";

export default {
  async fetch(request: Request, env: CloudflareBindings): Promise<Response> {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    if (!url) {
      return new Response("Please add an ?url=https://example.com/ parameter", {
        status: 400,
      });
    }

    const browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.setViewport({ width: 960, height: 720 });
    await page.goto(url);
    const screenshot = await page.screenshot({
      type: "webp",
      quality: 80,
    });

    const key = `screenshot-api/${randomUUID()}.webp`;
    await env.BUCKET.put(key, screenshot, {
      httpMetadata: { contentType: "image/webp" },
    });

    const screenshotUrl = `${env.BUCKET_URL}/${key}`;
    return new Response(JSON.stringify({ url: screenshotUrl }), {
      headers: { "content-type": "application/json" },
    });
  },
};
