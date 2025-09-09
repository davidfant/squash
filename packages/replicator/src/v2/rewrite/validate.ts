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
  examples: Array<{
    nodeId: Metadata.ReactFiber.NodeId;
    jsx: string;
    html: string;
  }>;
}): Promise<
  | {
      message: string;
      nodeIds: Set<Metadata.ReactFiber.NodeId>;
    }
  | undefined
> {
  const rendered = await render({
    component: opts.component,
    state: opts.state,
    examples: opts.examples.map((e) => e.jsx),
  });

  if (!rendered.ok) {
    return {
      message: Prompts.buildErrorsUserMessage(rendered.errors),
      nodeIds: new Set(opts.examples.map((e) => e.nodeId)),
    };
  } else {
    const errors = await Promise.all(
      rendered.results.map(async (r, i) => {
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
          const diff = await diffRenderedHtml(opts.examples[i]!.html, r.html);
          if (!!diff) {
            errors.push({
              message: "Differences in rendered HTML",
              description: `\`\`\`diff\n${diff}\n\`\`\``,
            });
          }
        }

        return errors;
      })
    );

    if (errors.some((e) => e.length)) {
      return {
        message: Prompts.renderErrorsUserMessage(errors, opts.examples, {
          maxNumExamples: 5,
        }),
        nodeIds: new Set(
          errors
            .map((e, i) => (e.length ? opts.examples[i]!.nodeId : undefined))
            .filter((v) => !!v)
        ),
      };
    }
  }
}
