import { randomUUID } from "crypto";
import { createRequire } from "module";
import path from "path";
import * as timers from "timers/promises";
import type * as TypeScript from "typescript";
import { pathToFileURL } from "url";
import { stripAnsi } from "./strip-ansi.js";

export async function startTypeScriptWatch(cwd: string) {
  const require = createRequire(import.meta.url);
  const tsPath = require.resolve("typescript", {
    paths: [cwd],
  });
  const ts = (await import(pathToFileURL(tsPath).href)) as typeof TypeScript;

  const configFile = ts.findConfigFile(cwd, ts.sys.fileExists);
  if (!configFile) {
    throw new Error("No tsconfig.json found");
  }

  type StatusCallback = (diag: TypeScript.Diagnostic) => void;
  const statusCallbacks = new Map<string, StatusCallback>();

  const host = ts.createWatchCompilerHost(
    configFile,
    { noEmit: true },
    ts.sys,
    ts.createSemanticDiagnosticsBuilderProgram,
    () => {},
    (diag) => {
      setTimeout(() => statusCallbacks.forEach((cb) => cb(diag)), 0);
    }
  );

  const watch = ts.createWatchProgram(host);

  return {
    isFileInProject: (filePath: string) => {
      const { config } = ts.readConfigFile(configFile, ts.sys.readFile);
      const parsed = ts.parseJsonConfigFileContent(
        config,
        ts.sys,
        path.dirname(configFile),
        {},
        configFile
      );
      return parsed.fileNames.includes(filePath);
    },
    waitForCompilationDone: async (timeout: number = 3_000) => {
      const id = randomUUID();
      return Promise.race<void>([
        timers
          .setTimeout(timeout)
          .then(() => Promise.reject(new Error("Timeout"))),
        new Promise((r) =>
          statusCallbacks.set(id, (diag) => {
            if (diag.code === 6193 || diag.code === 6194) {
              r();
            }
          })
        ),
      ]).finally(() => statusCallbacks.delete(id));
    },
    getErrorSummary: () => {
      const diags = ts.getPreEmitDiagnostics(watch.getProgram().getProgram());
      if (!diags.length) return;
      const formatted = ts.formatDiagnosticsWithColorAndContext(
        ts.sortAndDeduplicateDiagnostics([...diags]),
        {
          getCanonicalFileName: (f) => path.relative(cwd, f),
          getCurrentDirectory: () => cwd,
          getNewLine: () => ts.sys.newLine,
        }
      );
      return stripAnsi(formatted);
    },
  };
}
