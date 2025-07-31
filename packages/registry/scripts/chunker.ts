// chunker-marked.ts
// npm i marked
import { Lexer, type TokensList } from "marked";

export type Chunk = {
  id: string;
  title: string;
  heading: string;
  path: string[];
  body: string;
};

export function chunkReadme(
  docId: string,
  md: string,
  maxChars = 1800,
  // minChunk = 200,
  maxHeadingLevel = 3
): Chunk[] {
  const tokens: TokensList = Lexer.lex(md);
  let title = "";
  const chunks: Chunk[] = [];
  let path: string[] = [];
  let heading = "";
  let buf = "";

  function flush() {
    const text = buf.trim();
    if (!text) return;
    for (const piece of splitByLength(text, maxChars)) {
      // if (piece.trim().length < Math.min(minChunk, maxChars * 0.1)) continue;
      chunks.push({
        id: `${docId}:${chunks.length}`,
        title,
        heading,
        path: [...path],
        body: piece.trim(),
      });
    }
    buf = "";
  }

  for (const t of tokens) {
    if (t.type === "heading") {
      const level = (t as any).depth as number;
      const text = (t as any).text as string;
      if (level === 1 && !title) title = text;
      if (level <= maxHeadingLevel) {
        flush();
        path = path.slice(0, level - 1);
        path[level - 1] = text;
        heading = text;
        continue;
      }
      // Lower-level headings (e.g., ####) just become text
      buf += "\n\n" + text + "\n\n";
    } else if (t.type === "code") {
      const code = (t as any).text as string;
      const lang = (t as any).lang ? (t as any).lang + "\n" : "";
      buf += `\n\n\`\`\`${lang}${code}\n\`\`\`\n\n`;
    } else if (t.type === "paragraph") {
      buf += "\n\n" + (t as any).text + "\n\n";
    } else if (t.type === "list") {
      const items = (t as any).items as Array<{ text: string }>;
      buf += "\n" + items.map((i) => `- ${i.text}`).join("\n") + "\n";
    } else if (t.type === "table") {
      // Convert tables to plain text rows
      const header =
        (t as any).header?.map((h: any) => h.text).join(" | ") || "";
      const rows =
        (t as any).rows
          ?.map((r: any[]) => r.map((c) => c.text).join(" | "))
          .join("\n") || "";
      buf += `\n${header}\n${rows}\n`;
    } else if (t.type === "space" || t.type === "hr") {
      buf += "\n\n";
    } else if (t.type === "blockquote") {
      buf +=
        "\n> " +
        (t as any).tokens?.map((x: any) => x.text || "").join("\n> ") +
        "\n";
    }
  }
  flush();

  // Add title to each chunk for boosting
  return chunks.map((c) => ({ ...c, title }));
}

// Reuse helpers from Option A if you like:
function splitByLength(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const paras = text.split(/\n{2,}/);
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if ((cur + (cur ? "\n\n" : "") + p).length <= maxChars) {
      cur += (cur ? "\n\n" : "") + p;
    } else {
      if (cur) out.push(cur);
      if (p.length <= maxChars) cur = p;
      else {
        for (let i = 0; i < p.length; i += maxChars)
          out.push(p.slice(i, i + maxChars));
        cur = "";
      }
    }
  }
  if (cur) out.push(cur);
  return out;
}
