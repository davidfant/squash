import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildObjectKeys,
  type DownloadedLogo,
  type LogoVariant,
  uploadLogo,
} from "./download-toolkit-logos";

type CliArgs = {
  slug: string;
  variant: LogoVariant;
  filePath: string;
};

export type UploadLogoOptions = CliArgs;

export async function uploadLogoFromFile(options: UploadLogoOptions) {
  const normalizedSlug = options.slug.trim();
  if (!normalizedSlug) {
    throw new Error("Slug is required.");
  }

  const logo = await readLocalLogo(options.filePath);
  const keys = buildObjectKeys(normalizedSlug, options.variant);

  console.log(
    `[info] Uploading ${options.variant} logo for ${normalizedSlug} (${keys.join(
      ", "
    )}).`
  );

  for (const key of keys) {
    await uploadLogo(key, logo);
    console.log(`[upload] Stored ${key}`);
  }
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  let slug: string | undefined;
  let variant: LogoVariant | undefined;
  let filePath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--slug":
      case "-s":
        slug = args[++i];
        break;
      case "--variant":
      case "-v": {
        const value = args[++i];
        if (value !== "light" && value !== "dark") {
          throw new Error(`Variant must be "light" or "dark", received "${value}".`);
        }
        variant = value;
        break;
      }
      case "--file":
      case "-f":
        filePath = args[++i];
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!slug) {
    throw new Error("Missing --slug option.");
  }

  if (!variant) {
    throw new Error("Missing --variant option (light|dark).");
  }

  if (!filePath) {
    throw new Error("Missing --file option pointing to the local SVG.");
  }

  return {
    slug,
    variant,
    filePath,
  };
}

async function readLocalLogo(filePath: string): Promise<DownloadedLogo> {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const ext = path.extname(absolutePath).toLowerCase();

  if (ext !== ".svg") {
    throw new Error(
      `Only SVG logos are supported. ${absolutePath} has extension "${ext || "<none>"}".`
    );
  }

  let body: Buffer;
  try {
    body = await readFile(absolutePath);
  } catch (error) {
    throw new Error(`Unable to read logo file at ${absolutePath}: ${String(error)}`);
  }

  if (body.byteLength === 0) {
    throw new Error(`Logo file at ${absolutePath} is empty.`);
  }

  return {
    body,
    contentType: "image/svg+xml",
  };
}

function printUsage() {
  console.log(
    [
      "Usage: tsx src/scripts/upload-logo.ts --slug <slug> --variant <light|dark> --file <path-to-svg>",
      "",
      "Example:",
      "  pnpm --filter @squashai/mcp-composio tsx src/scripts/upload-logo.ts --slug salesforce --variant light --file ./Vector.svg",
    ].join("\n")
  );
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
  uploadLogoFromFile(parseArgs()).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
