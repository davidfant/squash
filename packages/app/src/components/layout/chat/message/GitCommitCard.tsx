import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useBranchContext } from "@/routes/branches/context";
import { RotateCw } from "lucide-react";

export function GitCommitCard({ title, sha }: { title: string; sha: string }) {
  const { preview, setPreview } = useBranchContext();
  const isCurrent = preview?.sha === sha;
  return (
    <Card
      className={cn(
        "py-2 transition-background",
        isCurrent && "bg-blue-500/10 border-blue-500"
      )}
    >
      <CardContent className="flex items-center gap-2">
        <div className="flex-1">
          <Badge variant={isCurrent ? "blue" : "gray"}>Version</Badge>
          <p className="font-medium">{title}</p>
          {/* <p className="text-muted-foreground">2 hours ago</p> */}
        </div>
        {!isCurrent && (
          //   <Badge variant="blue">Current</Badge>
          // ) : (
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setPreview(sha)}
          >
            <RotateCw /> Restore
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
