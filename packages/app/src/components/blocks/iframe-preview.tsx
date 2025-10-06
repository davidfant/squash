import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function IframePreview({
  url,
  imageUrl,
  loading,
  className,
}: {
  url: string | null;
  imageUrl?: string | null;
  loading?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "p-0 h-full overflow-hidden shadow-none bg-muted",
        className
      )}
    >
      {url ? (
        <iframe src={url} className="w-full h-full" />
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt="Preview"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="h-full grid place-items-center text-muted-foreground text-sm">
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "No preview available"
          )}
        </div>
      )}
      {/* <div className="absolute inset-0 z-1 overflow-y-auto">{placeholder}</div> */}
    </Card>
  );
}
