import type { ComponentRegistry } from "@/lib/componentRegistry";
import * as prettier from "@/lib/prettier";
import type { Root } from "hast";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeRecma from "rehype-recma";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { recmaFixProperties } from "../../recma/fixProperties";
import { recmaRemoveRedundantFragment } from "../../recma/removeRedundantFragment";
import { recmaReplaceRefs } from "../../recma/replaceRefs";
import { rehypeStripSquashAttribute } from "../../rehype/stripSquashAttribute";
import { rehypeUnwrapRefs } from "../../rehype/unwrapRefs";
import { recmaWrapAsComponent } from "../../rehype/wrapAsComponent";
import type { RewriteComponentInstance } from "../types";

export function buildInstanceExamples(
  instances: RewriteComponentInstance[],
  registry: ComponentRegistry
) {
  const processors = {
    html: unified()
      .use(rehypeStripSquashAttribute)
      .use(rehypeUnwrapRefs)
      .use(rehypeStringify),
    jsx: unified()
      .use(rehypeStripSquashAttribute)
      .use(rehypeRecma)
      .use(recmaJsx)
      .use(recmaRemoveRedundantFragment)
      .use(recmaWrapAsComponent, "Sample")
      .use(recmaReplaceRefs, { componentRegistry: registry })
      .use(recmaFixProperties)
      .use(recmaStringify),
  };

  return Promise.all(
    instances.map(async (i) => {
      const [jsx, html] = await Promise.all([
        processors.jsx
          .run({ type: "root", children: [i.ref] })
          .then((estree) => processors.jsx.stringify(estree))
          .then(prettier.ts),
        processors.html
          .run({ type: "root", children: i.children } as Root)
          .then((t: any) => processors.html.stringify(t as Root))
          .then(prettier.html),
      ]);
      return { jsx, html };
    })
  );
}
