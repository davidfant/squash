// import type { Element, Root } from "hast";
// import { visit } from "unist-util-visit";

// /**
//  * Rehype plugin that identifies relative URLs in HTML content
//  * and adds them to Context.urlsToDownload for later processing.
//  * Handles link, script, style, and img elements.
//  */
// export const rehypeIdentifyUrlsToDownload =
//   (ctx: Context) => () => (tree: Root) => {
//     visit(tree, "element", (node: Element) => {
//       // Check different types of elements that can contain relative URLs
//       switch (node.tagName) {
//         case "link":
//           // Handle <link> elements (stylesheets, preload, etc.)
//           handleLinkElement(node, ctx);
//           break;
//         case "script":
//           // Handle <script> elements with src attribute
//           handleScriptElement(node, ctx);
//           break;
//         case "style":
//           // Handle inline <style> elements that might contain @import or url()
//           handleStyleElement(node, ctx);
//           break;
//         case "img":
//           // Handle <img> elements with src and srcset attributes
//           handleImgElement(node, ctx);
//           break;
//         // case "meta":
//         //   // Handle <meta> elements that might reference files (like favicons)
//         //   handleMetaElement(node, ctx);
//         //   break;
//       }
//     });
//   };

// /**
//  * Handle <link> elements and extract relative URLs
//  */
// function handleLinkElement(node: Element, ctx: Context): void {
//   const href = getAttributeValue(node, "href");
//   if (href && isRelativeUrl(href)) {
//     ctx.urlsToDownload.add(href);
//   }
// }

// /**
//  * Handle <script> elements and extract relative URLs from src attribute
//  */
// function handleScriptElement(node: Element, ctx: Context): void {
//   const src = getAttributeValue(node, "src");
//   if (src && isRelativeUrl(src)) {
//     ctx.urlsToDownload.add(src);
//   }
// }

// /**
//  * Handle <style> elements and extract relative URLs from CSS content
//  */
// function handleStyleElement(node: Element, ctx: Context): void {
//   // Check if the style element has text content
//   if (node.children && node.children.length > 0) {
//     for (const child of node.children) {
//       if (child.type === "text") {
//         const cssContent = child.value;
//         extractUrlsFromCss(cssContent, ctx);
//       }
//     }
//   }
// }

// /**
//  * Handle <img> elements and extract relative URLs from src and srcset attributes
//  */
// function handleImgElement(node: Element, ctx: Context): void {
//   // Handle src attribute
//   const src = node.properties?.src;

//   if (typeof src === "string" && isRelativeUrl(src)) {
//     ctx.urlsToDownload.add(src);
//   }

//   // Handle srcset attribute
//   const srcset = node.properties?.srcSet;
//   if (typeof srcset === "string") {
//     const urls = extractUrlsFromSrcset(srcset);
//     for (const url of urls) {
//       if (isRelativeUrl(url)) {
//         ctx.urlsToDownload.add(url);
//       }
//     }
//   }
// }

// /**
//  * Handle <meta> elements that might reference files
//  */
// function handleMetaElement(node: Element, ctx: Context): void {
//   const name = getAttributeValue(node, "name");
//   const property = getAttributeValue(node, "property");
//   const content = getAttributeValue(node, "content");

//   // Check for favicon and other meta tags that reference files
//   if (content && isRelativeUrl(content)) {
//     // Common meta tags that reference files
//     const fileReferencingTags = [
//       "msapplication-TileImage",
//       "msapplication-config",
//       "apple-touch-icon",
//       "shortcut icon",
//       "icon",
//     ];

//     if (
//       (name && fileReferencingTags.includes(name)) ||
//       (property &&
//         (property.startsWith("og:") || property.startsWith("twitter:")))
//     ) {
//       ctx.urlsToDownload.add(content);
//     }
//   }
// }

// /**
//  * Extract URLs from CSS content (handles @import and url() declarations)
//  */
// function extractUrlsFromCss(cssContent: string, ctx: Context): void {
//   // Match @import statements
//   const importRegex = /@import\s+(?:url\()?['"]([^'"]+)['"](?:\))?/g;
//   let match;
//   while ((match = importRegex.exec(cssContent)) !== null) {
//     const url = match[1];
//     if (url && isRelativeUrl(url)) {
//       ctx.urlsToDownload.add(url);
//     }
//   }

//   // Match url() declarations
//   const urlRegex = /url\(['"]?([^'"]+)['"]?\)/g;
//   while ((match = urlRegex.exec(cssContent)) !== null) {
//     const url = match[1];
//     if (url && isRelativeUrl(url)) {
//       ctx.urlsToDownload.add(url);
//     }
//   }
// }

// /**
//  * Extract URLs from srcset attribute
//  * srcset format: "url1 1x, url2 2x" or "url1 100w, url2 200w"
//  */
// function extractUrlsFromSrcset(srcset: string): string[] {
//   const urls: string[] = [];

//   // Split by comma to get individual srcset entries
//   const entries = srcset.split(",");

//   for (const entry of entries) {
//     // Each entry is in format: "url descriptor" where descriptor is optional
//     // Examples: "image.jpg 1x", "image.jpg 100w", "image.jpg"
//     const trimmed = entry.trim();

//     // Split by whitespace and take the first part as the URL
//     const parts = trimmed.split(/\s+/);
//     if (parts.length > 0 && parts[0]) {
//       urls.push(parts[0]);
//     }
//   }

//   return urls;
// }

// /**
//  * Get attribute value from an element
//  */
// function getAttributeValue(
//   node: Element,
//   attributeName: string
// ): string | undefined {
//   if (!node.properties) return undefined;
//   const value = node.properties[attributeName];
//   return typeof value === "string" ? value : undefined;
// }

// /**
//  * Check if a URL is relative (not absolute or data URI)
//  */
// function isRelativeUrl(url: string): boolean {
//   // Skip absolute URLs (http://, https://, //, etc.)
//   if (
//     url.startsWith("http://") ||
//     url.startsWith("https://") ||
//     url.startsWith("//")
//   ) {
//     return false;
//   }

//   if (url.startsWith("data:")) return false;
//   if (url.startsWith("blob:")) return false;
//   // Skip javascript: and other protocol schemes
//   if (url.includes(":") && !url.startsWith("./") && !url.startsWith("../")) {
//     return false;
//   }

//   return true;
// }
