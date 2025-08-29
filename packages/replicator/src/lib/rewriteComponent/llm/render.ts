import type { ComponentRegistry } from "@/lib/componentRegistry";
import type { Metadata } from "@/types";
import esbuild from "esbuild";
import { createRequire } from "node:module";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentInstance } from "./types";

type ComponentId = Metadata.ReactFiber.ComponentId;

interface RenderOptions {
  component: { name: string; code: string };
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

async function buildDepModules(
  deps: Set<ComponentId>,
  registry: ComponentRegistry,
  nodeRequire: NodeJS.Require
): Promise<Record<string, any>> {
  const moduleMap: Record<string, any> = {};
  await Promise.all(
    [...deps].map(async (depId) => {
      const regItem = registry.get(depId);
      if (!regItem) throw new Error(`Unknown dep ${depId}`);
      const compiled = await compileComponent(regItem.code);
      const mod = { exports: {} };
      vm.runInNewContext(compiled, { module: mod, require: nodeRequire });
      moduleMap[regItem.module] = mod.exports;
    })
  );

  return moduleMap;
}

async function buildComponentToRewriteModule(
  component: { name: string; code: string },
  nodeRequire: NodeJS.Require
) {
  const compiled = await compileComponent(component.code);
  const mod = { exports: {} as Record<string, any> };
  vm.runInNewContext(compiled, { module: mod, require: nodeRequire });
  return {
    "./ComponentToRewrite": {
      ComponentToRewrite: mod.exports[component.name],
    },
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
  const element = React.createElement(ctx.module.exports.Sample);
  return renderToStaticMarkup(element);
}

export async function render(opts: RenderOptions): Promise<string[]> {
  const require = createRequire(import.meta.url);
  const [compModule, depModules] = await Promise.all([
    buildComponentToRewriteModule(opts.component, require),
    buildDepModules(opts.deps, opts.componentRegistry, require),
  ]);
  const modules = { ...depModules, ...compModule } as Record<string, any>;
  const ctx = vm.createContext({
    require: (spec: string) => modules[spec] ?? require(spec),
  });
  return Promise.all(
    opts.instances.map((inst, i) => renderSample(ctx, inst.jsx, i))
  );
}
