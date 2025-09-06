import type { Metadata } from "@/types";
import esbuild from "esbuild";
import { createRequire } from "node:module";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReplicatorState } from "../state";

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
  component: {
    id: ComponentId;
    name: { original: string; new: string };
    code: string;
  };
  state: ReplicatorState;
  examples: string[];
}

async function compileComponent(
  esmCode: string
): Promise<{ ok: true; code: string } | { ok: false; errors: string[] }> {
  try {
    const { code } = await esbuild.transform(esmCode, {
      loader: "tsx",
      format: "cjs",
      jsx: "automatic",
      sourcemap: false,
    });
    return { ok: true, code };
  } catch (err) {
    const bf = err as esbuild.BuildFailure;
    return { ok: false, errors: bf.errors.map((e) => e.text) };
  }
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

function withConsoleCapture<T>(fn: () => T): { result: T | null; logs: Log[] } {
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
  } catch (_error) {
    const error = _error as Error;
    if (error.stack) {
      const stack = error.stack.replace(/\((.+node_modules)/g, "(node_modules");
      return { result: null, logs: [{ level: "error", message: stack }] };
    } else {
      throw error;
    }
  } finally {
    console.error = origError;
    console.warn = origWarn;
  }
}

async function renderSample(
  ctx: vm.Context,
  sampleCode: string,
  index: number
): Promise<{ html: string | null; logs: Log[] }> {
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
): Promise<
  | { ok: true; results: Array<{ html: string | null; logs: Log[] }> }
  | { ok: false; errors: string[] }
> {
  const modules: Record<string, Module> = {};
  let codeBuildErrors: string[] | undefined = undefined;
  await Promise.all([
    (async () => {
      const compiled = await compileComponent(opts.component.code);
      if (compiled.ok) {
        modules[`./${opts.component.name.original}`] = {
          code: compiled.code,
          transform: (m) => ({
            [opts.component.name.original]: m[opts.component.name.new],
          }),
        };
      } else {
        codeBuildErrors = compiled.errors;
      }
    })(),
    (async () => {
      const compiled = await compileComponent(`
        import { clsx, type ClassValue } from "clsx";
        import { twMerge } from "tailwind-merge";

        export function cn(...inputs: ClassValue[]) {
          return twMerge(clsx(inputs))
        }
      `);

      if (!compiled.ok) throw new Error("Failed to compile utils");
      modules["@/lib/utils"] = { code: compiled.code };
    })(),
    ...[...opts.state.component.registry.values()]
      // .filter((cid) => cid !== opts.component.id)
      .map(async (item) => {
        const compiled = await compileComponent(item.code);
        if (!compiled.ok) throw new Error(`Failed to compile ${item.id}`);
        modules[`@/${item.dir}/${item.name}`] = {
          code: compiled.code,
        };
      }),
  ]);

  // if (opts.component.id === "C30") {
  //   console.log(opts.state.component.registry);
  //   // process.exit(0);
  // }

  if (codeBuildErrors) return { ok: false, errors: codeBuildErrors };

  const require = makeLazyRequire(modules);
  const ctx = vm.createContext({ require });
  const results = await Promise.all(
    opts.examples.map((jsx, i) => renderSample(ctx, jsx, i))
  );
  return { ok: true, results };
}
