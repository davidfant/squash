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
  //   vm.runInNewContext(
  //     `
  // var __defProp = Object.defineProperty;
  // var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  // var __getOwnPropNames = Object.getOwnPropertyNames;
  // var __hasOwnProp = Object.prototype.hasOwnProperty;
  // var __export = (target, all) => {
  //   for (var name in all)
  //     __defProp(target, name, { get: all[name], enumerable: true });
  // };
  // var __copyProps = (to, from, except, desc) => {
  //   if (from && typeof from === "object" || typeof from === "function") {
  //     for (let key of __getOwnPropNames(from))
  //       if (!__hasOwnProp.call(to, key) && key !== except)
  //         __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  //   }
  //   return to;
  // };
  // var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  // var stdin_exports = {};
  // __export(stdin_exports, {
  //   RouteAnnouncer: () => RouteAnnouncer
  // });
  // module.exports = __toCommonJS(stdin_exports);
  // var import_jsx_runtime = require("react/jsx-runtime");
  // var import_react = require("react");
  // function RouteAnnouncer({}) {
  //   const [announcement, setAnnouncement] = (0, import_react.useState)("");
  //   const hasInitialized = (0, import_react.useRef)(false);
  //   const asPath = typeof window !== "undefined" ? window.location.pathname : "/";
  //   (0, import_react.useEffect)(() => {
  //     if (hasInitialized.current) {
  //       if (document.title) {
  //         setAnnouncement(document.title);
  //       } else {
  //         const h1 = document.querySelector("h1");
  //         const text = h1?.innerText || h1?.textContent;
  //         setAnnouncement(text || asPath);
  //       }
  //     } else {
  //       hasInitialized.current = true;
  //     }
  //   }, [asPath]);
  //   return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
  //     "p",
  //     {
  //       "aria-live": "assertive",
  //       id: "__next-route-announcer__",
  //       role: "alert",
  //       style: {
  //         border: 0,
  //         clip: "rect(0 0 0 0)",
  //         height: "1px",
  //         margin: "-1px",
  //         overflow: "hidden",
  //         padding: 0,
  //         position: "absolute",
  //         width: "1px",
  //         whiteSpace: "nowrap",
  //         wordWrap: "normal"
  //       },
  //       children: announcement
  //     }
  //   );
  // }
  //     `,
  //     { module: compModule, require: nodeRequire }
  //   );

  vm.runInNewContext(compiledComponent, {
    module: compModule,
    require: nodeRequire,
  });

  const moduleMap: Record<string, any> = {
    "./ComponentToRewrite": {
      ComponentToRewrite: compModule.exports[opts.rewritten.name],
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
  const ctx = makeContext(compiled, opts);
  return Promise.all(
    opts.instances.map((inst, i) => renderSample(ctx, inst.jsx, i))
  );
}
