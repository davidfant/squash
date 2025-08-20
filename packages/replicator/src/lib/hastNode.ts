import * as prettier from "@/lib/prettier";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeRecma from "rehype-recma";
import { unified } from "unified";
import { recmaFixProperties } from "./recma/fixProperties";
import { recmaRemoveRedundantFragment } from "./recma/removeRedundantFragment";
import { recmaReplaceRefs } from "./recma/replaceRefs";

export type HastNode = any;

export async function hastNodeToTsxModule(hastRoot: HastNode): Promise<string> {
  const processor = unified()
    .use(rehypeRecma)
    .use(recmaJsx)
    .use(recmaReplaceRefs)
    .use(recmaFixProperties)
    .use(recmaRemoveRedundantFragment)
    .use(recmaStringify);
  const estree = await processor.run(hastRoot);
  const js = String(processor.stringify(estree as any));
  return prettier.js(js);
}
