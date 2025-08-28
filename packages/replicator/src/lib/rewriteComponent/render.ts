import type { RefImport } from "@/types";
import esbuild from "esbuild";
import { createRequire } from "node:module";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentInstance } from "./types";

interface RenderOptions {
  original: RefImport;
  rewritten: { name: string; code: string };
  instances: ComponentInstance[];
}

async function compileComponent(componentSource: string): Promise<string> {
  const { code } = await esbuild.transform(componentSource, {
    loader: "tsx",
    format: "cjs",
    jsx: "automatic",
    sourcemap: false,
  });
  return code;
}

function makeContext(
  compiledComponent: string,
  opts: Pick<RenderOptions, "original" | "rewritten">
): vm.Context {
  const nodeRequire = createRequire(import.meta.url);

  const compModule: any = { exports: {} };
  vm.runInNewContext(compiledComponent, {
    module: compModule,
    require: nodeRequire,
  });

  const moduleMap: Record<string, any> = {
    [`@/components/${opts.original.name}`]: {
      [opts.original.name]: compModule.exports[opts.rewritten.name],
    },
    [`@/components/${opts.rewritten.name}`]: compModule.exports,
  };

  return vm.createContext({
    require: (spec: string) => moduleMap[spec] ?? nodeRequire(spec),
  });
}

async function renderSample(
  ctx: vm.Context,
  sampleSrc: string,
  index: number
): Promise<string> {
  // esbuild just turns TSX → CJS; we don't bundle so 'require' calls stay.
  const { code } = await esbuild.transform(sampleSrc, {
    loader: "tsx",
    format: "cjs",
    jsx: "automatic",
  });

  ctx.module = { exports: {} };

  vm.runInContext(code, ctx, { filename: `sample-${index}.cjs` });
  const element = React.createElement(ctx.module.exports.Sample);
  return renderToStaticMarkup(element);
}

export async function render(opts: RenderOptions): Promise<string[]> {
  const compiled = await compileComponent(opts.rewritten.code);
  const ctx = makeContext(compiled, opts);
  return Promise.all(
    opts.instances.map((inst, i) => renderSample(ctx, inst.jsx, i))
  );
}
