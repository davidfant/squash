import aiGatewayComposioDocs from "./ai-gateway-composio.md";
import aiGatewayDocs from "./ai-gateway.md";
import clerkTrpcDocs from "./clerk-trpc.md";
import clerkDocs from "./clerk.md";
import cloudflareWorkerDocs from "./cloudflare-worker.md";
import composioDocs from "./composio.md";
import shadcnDocs from "./shadcn.md";
import trpcDocs from "./trpc.md";

export interface Documentation {
  modules: string[];
  title: string;
  summary: string;
  content: string;
  // url: string;
}

export function parseDocs(modules: string[], src: string): Documentation {
  const clean = src.replace(/\r\n?/g, "\n").trim();

  // Use a single RegExp so we only scan the string once
  //   1. ^# (.+)  ⇒ captures the first “# …” line (the title)
  //   2. ([\s\S]*?)\n---\n  ⇒ lazily captures everything up to the first “---” (the summary)
  //   3. ([\s\S]*)$        ⇒ captures everything after “---” (the content)
  const match = clean.match(/^#\s*(.+?)\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    throw new Error(
      `Document for ${modules.join(
        " + "
      )} is missing a title, summary or '---' separator.`
    );
  }

  const [, rawTitle, rawSummary, rawContent] = match;

  return {
    modules,
    title: rawTitle!.trim(),
    summary: rawSummary!.trim(),
    content: rawContent!.trim(),
  };
}

export const docs: Documentation[] = [
  parseDocs(["ai-gateway"], aiGatewayDocs),
  parseDocs(["ai-gateway", "composio"], aiGatewayComposioDocs),
  parseDocs(["cloudflare-worker"], cloudflareWorkerDocs),
  parseDocs(["composio"], composioDocs),
  parseDocs(["shadcn"], shadcnDocs),
  parseDocs(["trpc"], trpcDocs),
  parseDocs(["clerk"], clerkDocs),
  parseDocs(["clerk", "trpc"], clerkTrpcDocs),
];

export const getDocsPrompt = (modules: string[]) =>
  docs
    .filter((d) => d.modules.every((m) => modules.includes(m)))
    .flatMap((d) => [
      `<documentation title="${d.title}">`,
      d.summary,
      "---",
      d.content,
      `</documentation>`,
    ])
    .join("\n");
