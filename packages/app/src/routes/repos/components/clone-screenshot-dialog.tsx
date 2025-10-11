import { FilePreview } from "@/components/layout/file/FilePreview";
import { useFileUpload } from "@/components/layout/file/useFileUpload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { api, useMutation } from "@/hooks/api";
import { cn } from "@/lib/utils";
import { WallpaperIcon } from "lucide-react";
import {
  useCallback,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from "react";
import { useNavigate } from "react-router";

interface CloneScreenshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CloneScreenshotDialog({
  open,
  onOpenChange,
}: CloneScreenshotDialogProps) {
  const navigate = useNavigate();
  const [isDragOver, setIsDragOver] = useState(false);
  const uploads = useFileUpload();

  const createRepo = useMutation(api.repos.$post, {
    onError: () => toast.error("Failed to create repository"),
  });

  const createBranch = useMutation(api.repos[":repoId"].branches.$post, {
    onSuccess: (data) => {
      onOpenChange(false);
      navigate(`/prototypes/${data.id}`);
    },
    onError: () => toast.error("Failed to create branch"),
  });

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      const clipboardFiles = Array.from(
        event.clipboardData?.files ?? []
      ).filter((file) => file.type.startsWith("image/"));

      if (!clipboardFiles.length) return;

      if (!event.clipboardData?.getData("text")) {
        event.preventDefault();
      }

      uploads.add(clipboardFiles);
    },
    [uploads.add]
  );

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    const hasFiles = Array.from(event.dataTransfer?.items ?? []).some(
      (item) => item.kind === "file"
    );
    if (!hasFiles) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const hasFiles = Array.from(event.dataTransfer?.items ?? []).some(
        (item) => item.kind === "file"
      );
      if (!hasFiles) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      if (!isDragOver) {
        setIsDragOver(true);
      }
    },
    [isDragOver]
  );

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(event.dataTransfer?.files ?? []).filter((file) =>
        file.type.startsWith("image/")
      );

      if (!files.length) {
        toast.error("Please drop image files only");
        return;
      }

      uploads.add(files);
    },
    [uploads.add]
  );

  const handleSubmit = async () => {
    if (!uploads.files.length || uploads.isUploading) return;

    // Create hidden base repo
    const newRepo = await createRepo.mutateAsync({
      json: { template: "base-vite-ts", hidden: true },
    });

    // Create branch with screenshots and clone-screenshot state
    await createBranch.mutateAsync({
      param: { repoId: newRepo.id },
      json: {
        message: {
          parts: [
            { type: "text", text: "Clone this screenshot" },
            ...uploads.files.map((f) => ({
              type: "file" as const,
              url: f.url,
              mediaType: f.mediaType,
              filename: f.filename,
            })),
            { type: "data-AgentState", data: { type: "clone-screenshot" } },
          ],
        },
      },
    });
  };

  const isSubmitting = createRepo.isPending || createBranch.isPending;
  const canSubmit =
    uploads.files.length > 0 && !uploads.isUploading && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-3xl"
        onPaste={handlePaste}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <DialogHeader>
          <DialogTitle>Clone from Screenshot</DialogTitle>
          <DialogDescription>
            Upload one or more screenshots to clone. You can drag & drop, paste,
            or browse for files.
          </DialogDescription>
        </DialogHeader>

        {/* Hidden file input */}
        {uploads.input}

        <div className="relative min-h-[300px]">
          {uploads.files.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {uploads.files.map((f) => (
                <FilePreview
                  key={f.id}
                  loading={f.status === "uploading"}
                  file={f}
                  onRemove={() => uploads.remove(f.id)}
                  className="h-32"
                />
              ))}
            </div>
          ) : (
            <div
              className={cn(
                "min-h-[300px] rounded-lg border-2 border-dashed border-border grid place-items-center cursor-pointer hover:border-muted-foreground transition-all",
                isDragOver && "border-blue-500 bg-blue-500/10"
              )}
              onClick={uploads.select}
            >
              <div className="flex flex-col items-center gap-4 text-center p-8">
                <WallpaperIcon className="size-16 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">
                    Drop screenshots here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You can also paste images from your clipboard
                  </p>
                </div>
              </div>
            </div>
          )}

          {isDragOver && uploads.files.length > 0 && (
            <div className="pointer-events-none absolute inset-0 bg-blue-500/10 border-2 border-blue-500 rounded-lg flex items-center justify-center">
              <div className="text-sm font-medium text-blue-600">
                Drop files to attach
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={isSubmitting}
            className="w-full"
          >
            Clone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
