import { Card } from "@/components/ui/card";

export function GettingStartedCard() {
  return (
    <Card className="border-dashed border-border/50 bg-muted/20 p-6 mt-8 shadow-none">
      <h3 className="font-medium text-sm mb-3">
        Getting started
      </h3>
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-sm mb-1">
            Create your first branch
          </h4>
          <p className="text-xs text-muted-foreground">
            Describe what you want to build in the input above,
            and hypershape will help you create it.
          </p>
        </div>
        <div>
          <h4 className="font-medium text-sm mb-1">
            Explore templates
          </h4>
          <p className="text-xs text-muted-foreground">
            Browse our collection of templates to get started
            quickly.
          </p>
        </div>
      </div>
    </Card>
  );
} 