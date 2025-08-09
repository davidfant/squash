import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import prettier from "prettier/standalone";
import recmaJsx from "recma-jsx";
import recmaStringify from "recma-stringify";
import rehypeRecma from "rehype-recma";
import { unified } from "unified";
import { recmaExtractJSXComponents } from "./recmaExtractJSXComponents";

export type HastNode = any;

export async function hastToStaticModule(hastRoot: HastNode): Promise<string> {
  const processor = unified()
    .use(rehypeRecma)
    .use(recmaJsx)
    .use(recmaExtractJSXComponents)
    .use(recmaStringify);
  const estree = await processor.run(hastRoot as any);
  const js = String(processor.stringify(estree as any));
  return await prettier.format(js, {
    parser: "babel",
    plugins: [parserBabel, parserEstree],
  });
}
