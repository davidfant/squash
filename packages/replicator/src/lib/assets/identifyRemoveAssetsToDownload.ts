import type { CheerioAPI } from "cheerio";

const isRelative = (url: string) =>
  // skip protocol-relative and absolute URLs
  !url.startsWith("//") &&
  !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url) &&
  // skip anchors, mailto, javascript:
  !url.startsWith("#") &&
  !url.startsWith("mailto:") &&
  !url.startsWith("javascript:");

export function identifyUrlsToDownload(
  $: CheerioAPI,
  pageUrl: string
): Set<string> {
  const urls = new Set<string>();
  const add = (src: string | undefined) => {
    if (src && isRelative(src)) {
      urls.add(new URL(src, pageUrl).toString());
    }
  };

  $("img[src], source[src], video[src], audio[src]").each((_, el) =>
    add($(el).attr("src"))
  );

  $("[srcset]").each((_, el) => {
    const srcset = $(el).attr("srcset");
    if (!srcset) return;
    srcset.split(",").forEach((entry) => {
      const [url] = entry.trim().split(/\s+/);
      add(url);
    });
  });

  $("link[href]").each((_, el) => add($(el).attr("href")));

  return urls;
}
