import { useBranchContext } from "@/components/layout/branch/context";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCw } from "lucide-react";
import { useState } from "react";

export function GitCommitAlert({
  title,
  sha,
  messageId,
}: {
  title: string;
  sha: string;
  messageId: string;
}) {
  const { previewSha, restoreVersion } = useBranchContext();
  const isCurrent = previewSha === sha;

  const [restoring, setRestoring] = useState(false);
  const handleRestore = async () => {
    try {
      setRestoring(true);
      await restoreVersion(messageId);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Alert className="bg-blue-500/10 border-blue-500 flex items-center gap-1 py-0 min-h-12">
      {/* <span>
        <BadgeCheck className="size-4" />
      </span> */}
      <AlertTitle className="flex-1">{title}</AlertTitle>
      {isCurrent ? (
        <Badge variant="blue">Current</Badge>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground -mr-2"
          onClick={handleRestore}
        >
          {restoring ? <Loader2 className="animate-spin" /> : <RotateCw />}
          {/* Restore */}
        </Button>
      )}
    </Alert>
  );
}
