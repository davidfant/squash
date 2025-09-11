import * as prettier from "@/lib/prettier";
import { recmaFixProperties } from "@/lib/recma/fixProperties";
import { recmaRemoveRedundantFragment } from "@/lib/recma/removeRedundantFragment";
import { recmaReplaceRefs } from "@/lib/recma/replaceRefs";
import { rehypeStripSquashAttribute } from "@/lib/rehype/stripSquashAttribute";
import { recmaWrapAsComponent } from "@/lib/rehype/wrapAsComponent";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeRecma from "rehype-recma";
import { unified } from "unified";
import type { RewriteComponentStrategy } from "../types";

export const rewriteComponentUseFirstStrategy: RewriteComponentStrategy =
  async (opts) => {
    const registry = opts.componentRegistry;
    const registryItem = registry.get(opts.component.id);
    if (!registryItem)
      throw new Error(`Component ${opts.component.id} not found in registry`);

    const processor = unified()
      .use(rehypeStripSquashAttribute)
      .use(rehypeRecma)
      .use(recmaJsx)
      .use(recmaRemoveRedundantFragment)
      .use(recmaWrapAsComponent, registryItem.name.value)
      .use(recmaReplaceRefs, registry)
      .use(recmaFixProperties)
      .use(recmaStringify);

    const estree = await processor.run({
      type: "root",
      children: opts.instances[0]!.children,
    });
    const code = await prettier.ts(processor.stringify(estree));
    return { code };
  };
