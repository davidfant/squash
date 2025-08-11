import { config } from "@/config";
import type { FileSink } from "@/lib/sinks/base";
import crypto from "crypto";
import type { Root } from "hast";
import { toHtml } from "hast-util-to-html";
import path from "path";
import parserHtml from "prettier/plugins/html";
import prettier from "prettier/standalone";
import { type Plugin } from "unified";
import { hastToStaticModule, type HastNode } from "../../hastToStaticModule";
import { nameComponents } from "../../nameComponents";

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function capitalize(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

function computeHash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 8);
}

/** The higher-order factory */
export const rehypeExtractByMatch =
  (
    sink: FileSink,
    match: (node: HastNode) => string | null
  ): Plugin<[], Root> =>
  () =>
  async (tree: Root) => {
    interface Match {
      parent: HastNode;
      index: number;
      node: HastNode;
      depth: number;
      path: string;
    }
    const matches: Match[] = [];

    // DFS collect candidates with depth
    (function walk(parent: HastNode, depth = 0) {
      const children: HastNode[] = parent.children || [];
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (!child || child.type !== "element") continue;

        const tag = child.tagName as string | undefined;
        // Don't re-extract already-inserted components, but do descend.
        if (typeof tag === "string" && tag.startsWith("Components$src$")) {
          walk(child, depth + 1);
          continue;
        }

        const path = match(child);
        if (path) {
          matches.push({
            parent,
            index: i,
            node: child,
            depth: depth + 1,
            path,
          });
        }

        walk(child, depth + 1);
      }
    })(tree as any);

    const html = await Promise.all(
      matches.map((occ) =>
        prettier.format(toHtml(occ.node), {
          parser: "html",
          plugins: [parserHtml],
        })
      )
    );

    const grouped: Record<
      string,
      Record<string, { html: string; name: string; matches: Match[] }>
    > = {};
    for (const match of matches) {
      const matchHtml = html[match.index]!;
      grouped[match.path] ??= {};
      const hash = computeHash(matchHtml);
      const name = `${capitalize(match.path.split("/").pop()!)}_${hash}`;
      grouped[match.path]![name] ??= { html: matchHtml, name, matches: [] };
      grouped[match.path]![name]!.matches.push(match);
    }

    if (config.componentNaming.enabled) {
      await Promise.all(
        Object.values(grouped).map(async (group) => {
          // TODO: consider not naming components that just have 1 occurance

          const named = await nameComponents({
            model: config.componentNaming.model,
            components: Object.entries(group).map(([id, match]) => ({
              id: id,
              jsx: match.html,
            })),
          });

          const used = new Set<string>();
          const uniquify = (s: string) => {
            let candidate = s;
            let n = 2;
            while (used.has(candidate)) candidate = `${s}${n++}`;
            used.add(candidate);
            return candidate;
          };

          Object.entries(group).forEach(
            ([id, match]) => (match.name = uniquify(named[id]!))
          );
        })
      );
    }

    const promises = new Map<string, Promise<void>>();
    Object.entries(grouped)
      .flatMap(([path, group]) =>
        Object.values(group).flatMap(({ html, name, matches }) =>
          matches.map((match) => ({ match, path, html, name }))
        )
      )
      .sort((a, b) => a.match.depth - b.match.depth)
      .forEach((n) => {
        const outDir = path.join("src/components", n.path);
        const rel = path.join(outDir, n.name).replaceAll(path.sep, "$");
        const componentTagName = `Components$${rel}`;
        n.match.parent.children[n.match.index] = {
          type: "element",
          tagName: componentTagName,
          properties: {},
          children: [],
        };

        const outPath = path.join(outDir, `${n.name}.jsx`);
        if (!promises.has(outPath)) {
          promises.set(
            outPath,
            hastToStaticModule(n.match.node).then((code) =>
              sink.writeText(outPath, code)
            )
          );
        }
      });

    await Promise.all(Array.from(promises.values()));
  };
