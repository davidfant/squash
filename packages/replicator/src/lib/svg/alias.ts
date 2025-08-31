import * as prettier from "@/lib/prettier";
import type { Metadata } from "@/types";
import { openai } from "@ai-sdk/openai";
import { Resvg } from "@resvg/resvg-wasm";
import { wrapLanguageModel } from "ai";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import { traceable } from "langsmith/traceable";
import { createHash } from "node:crypto";
import { z } from "zod";
import { generateObject } from "../ai";
import { filesystemCacheMiddleware } from "../filesystemCacheMiddleware";
import { replaceSVGPathAliases } from "./replace";

const model = wrapLanguageModel({
  model: openai("gpt-5-mini"),
  middleware: filesystemCacheMiddleware(),
});

const describePrompt = `
You will be given an SVG as text and as an image. Your job is to give the SVG a name and a short description one sentence description.
`.trim();

export type DescribeSVGStrategy = (
  svg: Cheerio<Element>
) => Promise<{ name: string; description: string }>;

export async function aliasSVGPaths(
  $: CheerioAPI,
  metadata: Metadata.ReactFiber | null,
  describe: DescribeSVGStrategy
): Promise<{
  html: string;
  metadata: Metadata.ReactFiber | null;
  dPathMapping: Map<string, string>;
}> {
  const svgs = $("svg")
    .filter((_, svg) => !!$(svg).find("path[d]").length)
    .toArray();

  const hashes = await Promise.all(svgs.map((svg) => createSVGHash(svg, $)));
  const svgsByHash = svgs.reduce((acc, svg, i) => {
    const hash = hashes[i]!;
    acc.set(hash, [...(acc.get(hash) || []), $(svg)]);
    return acc;
  }, new Map<string, Cheerio<Element>[]>());
  const uniqHashes = [...new Set(hashes)];

  const details = await Promise.all(
    uniqHashes.map(
      traceable((hash: string) => describe(svgsByHash.get(hash)![0]!), {
        name: "Create SVG details",
      })
    )
  );

  // Create mapping from original d values to placeholders
  const dPathMapping = new Map<string, string>();

  uniqHashes.forEach((hash, svgIndex) =>
    svgsByHash.get(hash)?.forEach((svg) => {
      const paths = $(svg).find("path[d]");

      paths.each((pathIndex, pathElement) => {
        const $path = $(pathElement);
        const originalD = $path.attr("d")!;
        // const placeholder = JSON.stringify({
        //   svgId: svgIndex,
        //   pathIndex,
        //   ...details[svgIndex],
        // });
        const d = details[svgIndex]!;
        const placeholder = `[[SVG:${svgIndex}|PATH:${pathIndex}|NAME:${d.name}|DESCRIPTION:${d.description}]]`;
        dPathMapping.set(originalD, placeholder);
        $path.attr("d", placeholder);
      });
    })
  );

  return {
    html: $.html(),
    metadata: replaceSVGPathAliases(metadata, dPathMapping),
    dPathMapping,
  };
}

const createSVGHash = async (svg: Element, $: CheerioAPI) =>
  createHash("md5")
    .update(await prettier.html($(svg).html()!))
    .digest("hex");

export const describeSVGWithLLM: DescribeSVGStrategy = async (
  svg: Cheerio<Element>
): Promise<{ name: string; description: string }> => {
  const svgString = svg.toString();
  const resvg = new Resvg(svgString);
  const pngData = resvg.render().asPng();

  const { object } = await generateObject({
    model,
    messages: [
      { role: "system", content: describePrompt },
      {
        role: "user",
        content: [
          { type: "text", text: await prettier.html(svgString) },
          { type: "image", image: pngData, mediaType: "image/png" },
        ],
      },
    ],
    schema: z.object({ name: z.string(), description: z.string() }),
  });
  return object;
};

export const describeSVGPlaceholder: DescribeSVGStrategy = async () => ({
  name: "N",
  description: "D",
});
