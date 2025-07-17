import type { MessagePart } from "@godmode/common";
import { Badge } from "@godmode/core/components/ui/badge";
import { Button } from "@godmode/core/components/ui/button";
import { Card, CardContent } from "@godmode/core/components/ui/card";
import { Loader2, X } from "lucide-react";

interface FilePreviewProps {
  file: MessagePart.File;
  onRemove?(): void;
  loading?: boolean;
}

export function FilePreview({ file, loading, onRemove }: FilePreviewProps) {
  const isImage = file.mimeType.startsWith("image/");
  const extension = file.mimeType.split("/").pop()?.toUpperCase();
  const url =
    file.data.type === "url"
      ? file.data.url
      : `data:${file.mimeType};base64,${file.data.data}`;
  return (
    <div className="relative group">
      <Card className="size-24 p-0 rounded-sm overflow-hidden">
        <CardContent className="p-0 h-full">
          {isImage ? (
            <img
              src={url}
              alt={file.filename}
              className="size-full object-cover"
            />
          ) : (
            <div className="p-2 h-full flex flex-col justify-between">
              <div className="text-xs font-medium text-ellipsis mb-1">
                {file.filename}
              </div>
              {/* <div className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </div> */}
              <div className="flex-1" />
              {!!extension && <Badge variant="outline">{extension}</Badge>}
            </div>
          )}
        </CardContent>
        {loading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Loader2 className="size-4 animate-spin" />
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
