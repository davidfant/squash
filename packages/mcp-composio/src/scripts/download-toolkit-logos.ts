import dotenv from "dotenv";
import { Buffer } from "node:buffer";
import path from "node:path";
import { pathToFileURL } from "node:url";

dotenv.config();

type ToolkitResponse = {
  items: Toolkit[];
  next_cursor: string | null;
};

type Toolkit = {
  slug: string;
  meta: {
    logo?: string | null;
    [key: string]: unknown;
  };
};

type DownloadedLogo = {
  body: Buffer;
  contentType: string;
};

type ListObjectsResponse = {
  success?: boolean;
  errors?: Array<{ message?: string }>;
  result?: {
    objects?: Array<{ key?: string }>;
    cursor?: string | null;
    truncated?: boolean;
  };
};

const REQUIRED_ENV_VARS = [
  "COMPOSIO_API_KEY",
  "CLOUDFLARE_R2_TOKEN",
  "CLOUDFLARE_R2_BUCKET",
  "CLOUDFLARE_ACCOUNT_ID",
] as const;

const env = getValidatedEnv();
const R2_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${env.accountId}/r2/buckets/${env.bucket}`;
const TOOLKITS_API = "https://backend.composio.dev/api/v3/toolkits";

async function main() {
  const [toolkits, existingLogoKeys] = await Promise.all([
    fetchAllToolkits(),
    fetchExistingLogoKeys(),
  ]);

  console.log(
    `Found ${toolkits.length} toolkits and ${existingLogoKeys.size} existing logo objects. Starting logo sync...`
  );

  await Promise.all(
    toolkits.map((toolkit) => processToolkit(toolkit, existingLogoKeys))
  );

  console.log("Logo sync complete.");
}

async function fetchAllToolkits(): Promise<Toolkit[]> {
  const results: Toolkit[] = [];
  let cursor: string | undefined;

  do {
    const pageUrl = new URL(TOOLKITS_API);
    pageUrl.searchParams.set("limit", "1000");
    if (cursor) {
      pageUrl.searchParams.set("cursor", cursor);
    }

    const response = await fetch(pageUrl, {
      headers: {
        "x-api-key": env.composioApiKey,
      },
    });

    if (!response.ok) {
      const message = await safeReadResponse(response);
      throw new Error(
        `Unable to fetch toolkits (status ${response.status}): ${message}`
      );
    }

    const payload = (await response.json()) as ToolkitResponse;
    results.push(...payload.items);
    cursor = payload.next_cursor ?? undefined;
  } while (cursor);

  return results;
}

async function processToolkit(toolkit: Toolkit, existingLogoKeys: Set<string>) {
  const slug = toolkit.slug.toLowerCase();
  const logoUrl =
    typeof toolkit.meta.logo === "string" ? toolkit.meta.logo : "";

  if (!logoUrl) {
    console.warn(`[warn] Toolkit ${slug} does not expose a logo URL.`);
    return;
  }

  const downloadedLogo = await downloadLogo(logoUrl, slug);
  if (!downloadedLogo) {
    return;
  }

  const objectKeys = buildObjectKeys(slug);
  for (const key of objectKeys) {
    if (existingLogoKeys.has(key)) continue;

    await uploadLogo(key, downloadedLogo);
    existingLogoKeys.add(key);
    console.log(`[upload] Stored ${key}`);
  }
}

function buildObjectKeys(slug: string): string[] {
  const normalizedSlug = slug.toLowerCase();
  const withoutExtension = [
    `logos/light/${normalizedSlug}`,
    `logos/dark/${normalizedSlug}`,
  ];
  const withExtension = withoutExtension.map((key) => `${key}.svg`);
  return Array.from(new Set([...withoutExtension, ...withExtension]));
}

async function downloadLogo(
  logoUrl: string,
  slug: string
): Promise<DownloadedLogo | null> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) {
      console.warn(
        `[warn] Unable to fetch logo for ${slug} (status ${response.status}).`
      );
      return null;
    }

    const contentType =
      response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("image/svg")) {
      console.warn(
        `[warn] Logo for ${slug} is not an SVG (content-type: ${
          contentType || "unknown"
        }).`
      );
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      console.warn(`[warn] Logo for ${slug} was empty.`);
      return null;
    }

    return {
      body: Buffer.from(arrayBuffer),
      contentType: "image/svg+xml",
    };
  } catch (error) {
    console.warn(`[warn] Failed to download logo for ${slug}:`, error);
    return null;
  }
}

async function uploadLogo(key: string, logo: DownloadedLogo) {
  const response = await fetch(buildObjectUrl(key), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${env.r2Token}`,
      "Content-Type": logo.contentType,
      "Content-Length": logo.body.byteLength.toString(),
    },
    body: logo.body,
  });

  if (!response.ok) {
    const message = await safeReadResponse(response);
    throw new Error(
      `Unable to upload ${key} (status ${response.status}): ${message}`
    );
  }
}

function buildObjectUrl(key: string): string {
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${R2_BASE_URL}/objects/${encodedKey}`;
}

function getValidatedEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  return {
    composioApiKey: process.env.COMPOSIO_API_KEY as string,
    r2Token: process.env.CLOUDFLARE_R2_TOKEN as string,
    bucket: process.env.CLOUDFLARE_R2_BUCKET as string,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID as string,
  };
}

async function fetchExistingLogoKeys(): Promise<Set<string>> {
  const keys = new Set<string>();
  let cursor: string | undefined;

  do {
    const url = new URL(`${R2_BASE_URL}/objects`);
    url.searchParams.set("prefix", "logos/");
    url.searchParams.set("limit", "1000");
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.r2Token}`,
      },
    });

    if (!response.ok) {
      const message = await safeReadResponse(response);
      throw new Error(
        `Unable to list existing logo objects (status ${response.status}): ${message}`
      );
    }

    const payload = (await response.json()) as ListObjectsResponse;

    if (payload.success === false) {
      const errorMessage =
        payload.errors
          ?.map((entry) => entry.message)
          .filter(Boolean)
          .join(", ") || "Unknown Cloudflare error";
      throw new Error(
        `Cloudflare responded with success=false while listing logo objects: ${errorMessage}`
      );
    }

    const objects = payload.result?.objects ?? [];
    for (const object of objects) {
      if (object?.key?.startsWith("logos/")) {
        keys.add(object.key);
      }
    }

    cursor = payload.result?.cursor ?? undefined;
  } while (cursor);

  return keys;
}

async function safeReadResponse(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "<unable to read response body>";
  }
}

function isDirectExecution(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  try {
    const entryUrl = pathToFileURL(path.resolve(process.argv[1])).href;
    return import.meta.url === entryUrl;
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
