import { useBranchContext } from "@/components/layout/branch/context";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { RotateCw } from "lucide-react";
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
  const { preview, restoreVersion } = useBranchContext();
  const isCurrent = preview.sha === sha;

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
          {restoring ? <Spinner /> : <RotateCw />}
          {/* Restore */}
        </Button>
      )}
    </Alert>
  );
}
