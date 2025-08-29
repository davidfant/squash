import type { ComponentRegistry } from "@/lib/componentRegistry";
import type { Metadata } from "@/types";
import esbuild from "esbuild";
import { createRequire } from "node:module";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentInstance } from "./types";

type ComponentId = Metadata.ReactFiber.ComponentId;

interface Module {
  code: string;
  transform?(module: Record<string, any>): Record<string, any>;
}

interface RenderOptions {
  component: { id: ComponentId; name: string; code: string };
  deps: Set<Metadata.ReactFiber.ComponentId>;
  instances: ComponentInstance[];
  componentRegistry: ComponentRegistry;
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

function makeLazyRequire(modules: Record<string, Module>) {
  const hostRequire = createRequire(import.meta.url);
  const cache: Record<string, any> = {};
  return function lazyRequire(spec: string) {
    if (cache[spec]) return cache[spec];
    const mod = modules[spec];
    if (!mod) return hostRequire(spec);

    const m = { exports: {} };
    const ctx = vm.createContext({
      module: m,
      exports: m.exports,
      require: lazyRequire,
    });
    vm.runInContext(modules[spec]!.code, ctx, { filename: spec });
    cache[spec] = mod.transform ? mod.transform(m.exports) : m.exports;
    return cache[spec];
  };
}

async function renderSample(
  ctx: vm.Context,
  sampleCode: string,
  index: number
): Promise<string> {
  // esbuild just turns TSX → CJS; we don't bundle so 'require' calls stay.
  const { code } = await esbuild.transform(sampleCode, {
    loader: "tsx",
    format: "cjs",
    jsx: "automatic",
  });

  ctx.module = { exports: {} };
  vm.runInContext(code, ctx, { filename: `sample-${index}.cjs` });
  // TODO: listen to console logs happening when creating this element.
  // E.g. "Each child in a list should have a unique key prop". These
  // errors should be reported back to the LLM
  const element = React.createElement(ctx.module.exports.Sample);
  return renderToStaticMarkup(element);
}

export async function render(opts: RenderOptions): Promise<string[]> {
  const modules: Record<string, Module> = {};
  await Promise.all([
    (async () => {
      const item = opts.componentRegistry.get(opts.component.id);
      if (!item) throw new Error(`Unknown component ${opts.component.id}`);
      const code = await compileComponent(item.code);
      modules[item.module] = {
        code,
        transform: (m) => ({ [item.name.value]: m[opts.component.name] }),
      };
    })(),
    ...[...opts.deps].map(async (cid) => {
      const item = opts.componentRegistry.get(cid);
      if (!item) throw new Error(`Unknown dep ${cid}`);
      const code = await compileComponent(item.code);
      modules[item.module] = { code };
    }),
  ]);

  const require = makeLazyRequire(modules);
  const ctx = vm.createContext({ require });
  return Promise.all(
    opts.instances.map((inst, i) => renderSample(ctx, inst.jsx, i))
  );
}
