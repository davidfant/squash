import type { ComponentAnalysisResult } from "@/lib/analyzeComponent";
import type { Metadata } from "@/types";
import { JSONPath } from "jsonpath-plus";

export const getPropFunctionsRequiredForRender = (
  analysis: ComponentAnalysisResult,
  props: Record<string, unknown>
): Record<string, unknown[]> =>
  analysis.functions
    .filter((f) => f.requiredForRender)
    .map((f) => f.jsonPath)
    .reduce(
      (acc, path) => {
        const hits = JSONPath({ path, json: props }).filter(
          (v: unknown) =>
            typeof v === "object" &&
            v !== null &&
            (v as Metadata.ReactFiber.PropValue.Function).$$typeof ===
              "function"
        );
        if (!hits.length) return acc;
        acc[path] = hits;
        return acc;
      },
      {} as Record<string, unknown[]>
    );
