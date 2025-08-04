import { toast } from "@/components/ui/sonner";
import type { FileUIPart } from "ai";
import { useCallback, useMemo, useRef, useState } from "react";

export interface ChatInputFile extends FileUIPart {
  id: string;
  status: "uploading" | "uploaded"; // | "error";
}

export function useFileUpload(initialFiles?: ChatInputFile[]) {
  const [files, setFiles] = useState(initialFiles ?? []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUploading = useMemo(
    () => files.some((u) => u.status === "uploading"),
    [files]
  );

  // const getSignedUrl = useMutation(api.upload.$post);
  const getSignedUrl = {
    mutateAsync: (...args: any[]) => ({
      uploadUrl: "https://example.com/upload",
      publicUrl: "https://example.com/public",
    }),
  };
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
          filename: file.name,
        });
        await fetch(signed.uploadUrl, {
          method: "PUT",
          body: file,
        });
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

  const handleFilesSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files!);
        const newUploads = files.map(
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
        newUploads.forEach((u, i) => upload(u.id, files[i]!));
        e.target.value = "";
      }
    },
    [upload]
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

  return { input, files, remove, select, isUploading, set: setFiles };
}
