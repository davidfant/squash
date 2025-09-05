import type { Metadata } from "@/types";
import type { ReplicatorState } from "../state";
import { diffRenderedHtml } from "./diffRenderedHtml";
import * as Prompts from "./prompts";
import { render } from "./render";

export async function validate(opts: {
  component: {
    id: Metadata.ReactFiber.ComponentId;
    name: { original: string; new: string };
    code: string;
  };
  state: ReplicatorState;
  examples: Array<{ jsx: string; html: string }>;
}): Promise<string | undefined> {
  const rendered = await render({
    component: opts.component,
    state: opts.state,
    examples: opts.examples.map((e) => e.jsx),
  });

  if (!rendered.ok) {
    return Prompts.buildErrorsUserMessage(rendered.errors);
  } else {
    const errors = rendered.results.map((r, i) => {
      const errors: Array<{ message: string; description: string }> = [];
      if (r.logs.length) {
        errors.push({
          message: "Warning logs",
          description: r.logs
            .map((l) => `[${l.level}] ${l.message}`)
            .join("\n"),
        });
      }

      if (r.html !== null) {
        const diff = diffRenderedHtml(opts.examples[i]!.html, r.html);
        if (!!diff) {
          errors.push({
            message: "Differences in rendered HTML",
            description: `\`\`\`diff\n${diff}\n\`\`\``,
          });
        }
      }

      return errors;
    });

    if (errors.some((e) => e.length)) {
      return Prompts.renderErrorsUserMessage(errors, opts.examples, {
        maxNumExamples: 10,
      });
    }
  }
}
