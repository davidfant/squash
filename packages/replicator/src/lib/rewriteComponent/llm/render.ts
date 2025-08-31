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

interface Log {
  level: "warn" | "error";
  message: string;
}

interface RenderOptions {
  component: { id: ComponentId; name: string; code: string };
  deps: {
    internal: Set<Metadata.ReactFiber.ComponentId>;
    all: Set<Metadata.ReactFiber.ComponentId>;
  };
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

function withConsoleCapture<T>(fn: () => T): { result: T; logs: Log[] } {
  const logs: Log[] = [];

  const origError = console.error;
  const origWarn = console.warn;

  const capture =
    (level: "error" | "warn") =>
    (...args: unknown[]) =>
      logs.push({ level, message: args.map(String).join(" ") });

  console.error = capture("error");
  console.warn = capture("warn");

  try {
    return { result: fn(), logs };
  } finally {
    console.error = origError;
    console.warn = origWarn;
  }
}

async function renderSample(
  ctx: vm.Context,
  sampleCode: string,
  index: number
): Promise<{ html: string; logs: Log[] }> {
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
  const output = withConsoleCapture(() => renderToStaticMarkup(element));
  return { html: output.result, logs: output.logs };
}

export async function render(
  opts: RenderOptions
): Promise<Array<{ html: string; logs: Log[] }>> {
  const modules: Record<string, Module> = {};
  console.log("RENDER", opts.component.id, opts.deps);
  await Promise.all([
    (async () => {
      const item = opts.componentRegistry.get(opts.component.id);
      if (!item) throw new Error(`Unknown component ${opts.component.id}`);
      if (!item.code) {
        throw new Error(`Component ${opts.component.id} missing code`);
      }
      const code = await compileComponent(item.code);
      modules[item.module] = {
        code,
        transform: (m) => ({ [item.name.value]: m[opts.component.name] }),
      };
    })(),
    (async () => {
      const code = await compileComponent(`
        import { clsx, type ClassValue } from "clsx";
        import { twMerge } from "tailwind-merge";

        export function cn(...inputs: ClassValue[]) {
          return twMerge(clsx(inputs))
        }
      `);

      modules["@/lib/utils"] = { code };
    })(),
    ...[...opts.deps.all]
      .filter((cid) => cid !== opts.component.id)
      .map(async (cid) => {
        const item = opts.componentRegistry.get(cid);
        if (!item) throw new Error(`Unknown dep ${cid}`);
        if (!item.code) {
          throw new Error(`Component ${cid} missing code`);
        }
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
