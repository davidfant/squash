import { Badge } from "@/components/ui/badge";
import type { WorkflowStep } from "@/content/types";

export const StepByStep = ({ steps }: { steps: WorkflowStep[] }) => {
  return (
    <section className="mx-auto max-w-2xl">
      <div className="text-center">
        <Badge variant="blue">Step-by-Step</Badge>
        <h1 className="mt-4 text-3xl">How to use it</h1>
        {/* <p className="text-muted-foreground mt-6 font-medium">{description}</p> */}
      </div>
      <div className="mx-auto mt-6 max-w-xl">
        {steps.map((step, index) => (
          <div key={index} className="mb-8 flex gap-4">
            <span className="bg-secondary text-primary flex size-6 shrink-0 items-center justify-center rounded-sm font-mono text-xs">
              {index + 1}
            </span>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-medium">{step.title}</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
