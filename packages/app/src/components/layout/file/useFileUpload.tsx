import { toast } from "@/components/ui/sonner";
import { api, useMutation } from "@/hooks/api";
import type { FileUIPart } from "ai";
import { useCallback, useMemo, useRef, useState } from "react";

export interface ChatInputFile extends FileUIPart {
  id: string;
  status: "uploading" | "uploaded"; // | "error";
}

/**
 * Validates that an image file's dimensions don't exceed the maximum allowed size.
 */
async function validateImageDimensions(
  file: File,
  maxDimension: number = 6000
): Promise<{ valid: boolean; width?: number; height?: number }> {
  // Only validate image files
  if (!file.type.startsWith("image/")) {
    return { valid: true };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { width, height } = img;
      const valid = width <= maxDimension && height <= maxDimension;
      resolve({ valid, width, height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // If we can't load the image, let it through (it will fail later)
      resolve({ valid: true });
    };

    img.src = objectUrl;
  });
}

export function useFileUpload(initialFiles?: ChatInputFile[]) {
  const [files, setFiles] = useState(initialFiles ?? []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUploading = useMemo(
    () => files.some((u) => u.status === "uploading"),
    [files]
  );

  const getSignedUrl = useMutation(api.upload.$post);
  const patchUpload = useCallback(
    (id: string, partial: Partial<ChatInputFile>) =>
      setFiles((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...partial } : i))
      ),
    []
  );

  const remove = useCallback(
    (id: string) => setFiles((prev) => prev.filter((u) => u.id !== id)),
    []
  );
  const select = useCallback(() => fileInputRef.current?.click(), []);

  const upload = useCallback(
    async (id: string, file: File) => {
      try {
        const signed = await getSignedUrl.mutateAsync({
          json: { filename: file.name },
        });
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await fetch(signed.uploadUrl, { method: "PUT", body: file });
          } catch (e) {
            console.warn("Failed uploading file", e, { file, signed, attempt });
          }
        }
        patchUpload(id, { status: "uploaded", url: signed.publicUrl });
      } catch (e) {
        console.error("Failed uploading file", upload, e);
        toast.error(`Failed uploading ${file.name} - please try again!`);
        // patchUpload(id, { status: "error" });
        remove(id);
      }
    },
    [getSignedUrl, remove, patchUpload]
  );

  const add = useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      // Validate image dimensions before adding
      const validationResults = await Promise.all(
        files.map(async (file) => ({
          file,
          validation: await validateImageDimensions(file),
        }))
      );

      // Filter out invalid images and show errors
      const validFiles: File[] = [];
      for (const { file, validation } of validationResults) {
        if (!validation.valid) {
          toast.error(
            `Image "${file.name}" is too large (${validation.width}x${validation.height}px). Maximum dimension is 6000px.`
          );
        } else {
          validFiles.push(file);
        }
      }

      if (!validFiles.length) return;

      const newUploads = validFiles.map(
        (file): ChatInputFile => ({
          id: Math.random().toString(36).substring(2, 15),
          type: "file",
          url: URL.createObjectURL(file),
          filename: file.name,
          mediaType: file.type,
          status: "uploading",
        })
      );
      setFiles((prev) => [...prev, ...newUploads]);
      await Promise.all(newUploads.map((u, i) => upload(u.id, validFiles[i]!)));
    },
    [upload]
  );

  const handleFilesSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        add(Array.from(e.target.files!));
        e.target.value = "";
      }
    },
    [add]
  );

  const input = (
    <input
      ref={fileInputRef}
      type="file"
      multiple
      hidden
      onChange={handleFilesSelected}
    />
  );

  return { input, files, remove, select, add, isUploading, set: setFiles };
}
