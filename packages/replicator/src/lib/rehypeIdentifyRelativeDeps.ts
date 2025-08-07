import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import type { Context } from "../types";

/**
 * Rehype plugin that identifies relative URLs in HTML head content
 * and adds them to Context.filesToDownload for later processing
 */
export const rehypeIdentifyRelativeDeps =
  (ctx: Context) => () => (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      // Check different types of elements that can contain relative URLs
      switch (node.tagName) {
        case "link":
          // Handle <link> elements (stylesheets, preload, etc.)
          handleLinkElement(node, ctx);
          break;
        case "script":
          // Handle <script> elements with src attribute
          handleScriptElement(node, ctx);
          break;
        case "style":
          // Handle inline <style> elements that might contain @import or url()
          handleStyleElement(node, ctx);
          break;
        case "meta":
          // Handle <meta> elements that might reference files (like favicons)
          handleMetaElement(node, ctx);
          break;
      }
    });
  };

/**
 * Handle <link> elements and extract relative URLs
 */
function handleLinkElement(node: Element, ctx: Context): void {
  const href = getAttributeValue(node, "href");
  if (href && isRelativeUrl(href)) {
    ctx.urlsToDownload.add(href);
  }
}

/**
 * Handle <script> elements and extract relative URLs from src attribute
 */
function handleScriptElement(node: Element, ctx: Context): void {
  const src = getAttributeValue(node, "src");
  if (src && isRelativeUrl(src)) {
    ctx.urlsToDownload.add(src);
  }
}

/**
 * Handle <style> elements and extract relative URLs from CSS content
 */
function handleStyleElement(node: Element, ctx: Context): void {
  // Check if the style element has text content
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      if (child.type === "text") {
        const cssContent = child.value;
        extractUrlsFromCss(cssContent, ctx);
      }
    }
  }
}

/**
 * Handle <meta> elements that might reference files
 */
function handleMetaElement(node: Element, ctx: Context): void {
  const name = getAttributeValue(node, "name");
  const property = getAttributeValue(node, "property");
  const content = getAttributeValue(node, "content");

  // Check for favicon and other meta tags that reference files
  if (content && isRelativeUrl(content)) {
    // Common meta tags that reference files
    const fileReferencingTags = [
      "msapplication-TileImage",
      "msapplication-config",
      "apple-touch-icon",
      "shortcut icon",
      "icon",
    ];

    if (
      (name && fileReferencingTags.includes(name)) ||
      (property &&
        (property.startsWith("og:") || property.startsWith("twitter:")))
    ) {
      ctx.urlsToDownload.add(content);
    }
  }
}

/**
 * Extract URLs from CSS content (handles @import and url() declarations)
 */
function extractUrlsFromCss(cssContent: string, ctx: Context): void {
  // Match @import statements
  const importRegex = /@import\s+(?:url\()?['"]([^'"]+)['"](?:\))?/g;
  let match;
  while ((match = importRegex.exec(cssContent)) !== null) {
    const url = match[1];
    if (url && isRelativeUrl(url)) {
      ctx.urlsToDownload.add(url);
    }
  }

  // Match url() declarations
  const urlRegex = /url\(['"]([^'"]+)['"]\)/g;
  while ((match = urlRegex.exec(cssContent)) !== null) {
    const url = match[1];
    if (url && isRelativeUrl(url)) {
      ctx.urlsToDownload.add(url);
    }
  }
}

/**
 * Get attribute value from an element
 */
function getAttributeValue(
  node: Element,
  attributeName: string
): string | undefined {
  if (!node.properties) return undefined;
  const value = node.properties[attributeName];
  return typeof value === "string" ? value : undefined;
}

/**
 * Check if a URL is relative (not absolute or data URI)
 */
function isRelativeUrl(url: string): boolean {
  // Skip absolute URLs (http://, https://, //, etc.)
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("//")
  ) {
    return false;
  }

  if (url.startsWith("data:")) return false;
  if (url.startsWith("blob:")) return false;
  // Skip javascript: and other protocol schemes
  if (url.includes(":") && !url.startsWith("./") && !url.startsWith("../")) {
    return false;
  }

  return url.startsWith("/");
}
