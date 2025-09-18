import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBranchContext } from "@/routes/branches/context";
import { BadgeCheck, RotateCw } from "lucide-react";

export function GitCommitCard({ title, sha }: { title: string; sha: string }) {
  const { preview, setPreview } = useBranchContext();
  const isCurrent = preview?.sha === sha;

  return (
    <Alert className="bg-blue-500/10 border-blue-500 flex items-center gap-2 py-0 min-h-12">
      <span>
        <BadgeCheck className="size-4" />
      </span>
      <AlertTitle className="flex-1">{title}</AlertTitle>
      {!isCurrent ? (
        <Badge variant="blue">Current</Badge>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setPreview(sha)}
        >
          <RotateCw /> Restore
        </Button>
      )}
    </Alert>
  );
}
