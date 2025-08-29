import esbuild from "esbuild";
import { createRequire } from "node:module";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentInstance } from "./types";

interface RenderOptions {
  rewritten: { name: string; code: string };
  instances: ComponentInstance[];
}

async function compileComponent(esmCode: string): Promise<string> {
  const { code } = await esbuild.transform(esmCode, {
    loader: "tsx",
    format: "cjs",
    jsx: "automatic",
    sourcemap: false,
  });
  return code;
}

function makeContext(component: { code: string; name: string }): vm.Context {
  const nodeRequire = createRequire(import.meta.url);

  const compModule: any = { exports: {} };
  vm.runInNewContext(component.code, {
    module: compModule,
    require: nodeRequire,
  });

  const moduleMap: Record<string, any> = {
    "./ComponentToRewrite": {
      ComponentToRewrite: compModule.exports[component.name],
    },
    // [`@/components/${opts.rewritten.name}`]: compModule.exports,
    // "@/components/rewritten/C81/RouteAnnouncer": compModule.exports,
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
  const ctx = makeContext({ name: opts.rewritten.name, code: compiled });
  return Promise.all(
    opts.instances.map((inst, i) => renderSample(ctx, inst.jsx, i))
  );
}
