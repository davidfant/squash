import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { FileUIPart } from "ai";
import { X } from "lucide-react";

interface FilePreviewProps {
  file: FileUIPart;
  loading?: boolean;
  className?: string;
  onRemove?(): void;
}

export function FilePreview({
  file,
  loading,
  className,
  onRemove,
}: FilePreviewProps) {
  const content = (() => {
    if (file.mediaType.startsWith("image/")) {
      return (
        <img
          src={file.url}
          alt={file.filename}
          className="object-cover w-auto h-full max-h-24"
        />
      );
    } else {
      const extension = file.mediaType.split("/").pop()?.toUpperCase();
      return (
        <div className="p-2 h-full flex flex-col justify-between aspect-square">
          <div className="text-xs font-medium text-ellipsis mb-1">
            {file.filename}
          </div>
          {/* <div className="text-xs text-muted-foreground">
          {(file.size / 1024).toFixed(1)} KB
        </div> */}
          <div className="flex-1" />
          {!!extension && <Badge variant="outline">{extension}</Badge>}
        </div>
      );
    }
  })();
  return (
    <div className="relative group">
      <Card
        className={cn("max-h-24 p-0 rounded-sm overflow-hidden", className)}
      >
        {content}
        {loading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Spinner className="size-4" />
          </div>
        )}
      </Card>
      {!!onRemove && (
        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          size="icon"
          variant="outline"
          className="absolute -top-2 -right-2 size-5 group-hover:opacity-100 opacity-0 rounded-full"
        >
          <X className="size-3" />
        </Button>
      )}
    </div>
  );
}
