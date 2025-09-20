import { FilePreview } from "@/components/layout/file/FilePreview";
import { useFileUpload } from "@/components/layout/file/useFileUpload";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FileUIPart } from "ai";
import { useCallback, useState, type ClipboardEvent } from "react";
import {
  ChatInputAttachButton,
  ChatInputDictateButton,
  ChatInputDictateCancelButton,
  ChatInputDictateStopButton,
  ChatInputStopButton,
  ChatInputSubmitButton,
} from "./buttons";
import { DictationOverlay } from "./DictationOverlay";
import { useDictation } from "./useDictation";

export interface ChatInputValue {
  text: string;
  files: FileUIPart[];
}

export function ChatInput({
  initialValue,
  submitting,
  autoFocus,
  minRows,
  maxRows,
  placeholder,
  disabled = false,
  Textarea: TextareaComponent = Textarea,
  repoPicker,
  onStop,
  onSubmit,
}: {
  initialValue?: ChatInputValue;
  submitting: boolean;
  autoFocus?: boolean;
  minRows?: number;
  maxRows?: number;
  placeholder?: string;
  disabled?: boolean;
  Textarea?: typeof Textarea;
  repoPicker?: React.ReactNode;
  onStop?(): void;
  onSubmit(value: ChatInputValue): unknown;
}) {
  const [value, setValue] = useState(initialValue?.text ?? "");
  const uploads = useFileUpload(
    initialValue?.files.map((f) => ({
      ...f,
      id: Math.random().toString(36).substring(2, 15),
      status: "uploaded",
    }))
  );
  const dictation = useDictation((t) => setValue((v) => (v ? `${v} ${t}` : t)));

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      if (disabled) return;

      const clipboardFiles = Array.from(
        event.clipboardData?.files ?? []
      ).filter((file) => file.type.startsWith("image/"));

      if (!clipboardFiles.length) return;

      if (!event.clipboardData?.getData("text")) {
        event.preventDefault();
      }

      uploads.add(clipboardFiles);
    },
    [disabled, uploads.add]
  );

  const handleSubmit = async () => {
    if (!value.length && !uploads.files.length) return;
    try {
      setValue("");
      uploads.set([]);
      await onSubmit({ text: value, files: uploads.files });
    } catch {
      setValue(value);
      uploads.set(uploads.files);
    }
  };

  const buttons = (() => {
    if (dictation.status !== "idle") {
      return (
        <>
          <ChatInputDictateCancelButton
            disabled={submitting || disabled}
            onClick={dictation.cancel}
          />
          <ChatInputDictateStopButton
            disabled={submitting || disabled}
            loading={dictation.status === "transcribing"}
            onClick={dictation.stop}
          />
        </>
      );
    }
    if (submitting && onStop) {
      return <ChatInputStopButton onClick={onStop} />;
    }

    return (
      <>
        <ChatInputDictateButton
          disabled={submitting || disabled}
          onClick={dictation.start}
        />
        <ChatInputSubmitButton
          disabled={submitting || uploads.isUploading || !value || disabled}
          loading={submitting || uploads.isUploading}
          onClick={handleSubmit}
        />
      </>
    );
  })();

  return (
    <Card className="p-2 transition-all shadow-none border border-input focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-4">
      <CardContent className="flex flex-col gap-2 p-0">
        {uploads.input}
        {uploads.files.length > 0 && (
          <div className="flex flex-wrap gap-2 ml-2">
            {uploads.files.map((f) => (
              <FilePreview
                key={f.id}
                loading={f.status === "uploading"}
                file={f}
                onRemove={() => uploads.remove(f.id)}
              />
            ))}
          </div>
        )}
        <div className="relative">
          <TextareaComponent
            value={value}
            autoFocus={autoFocus}
            minRows={minRows}
            maxRows={maxRows}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
            className="text-lg border-none shadow-none bg-transparent focus:ring-0 focus-visible:ring-0"
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div
            className={cn(
              "absolute inset-0 bg-background opacity-0 transition-opacity pointer-events-none",
              dictation.status !== "idle" && "opacity-100"
            )}
          >
            <DictationOverlay
              status={dictation.status}
              levels={dictation.levels}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <ChatInputAttachButton
            disabled={submitting || disabled}
            onClick={uploads.select}
          />
          {repoPicker}
          <div className="flex-1" />
          {buttons}
        </div>
      </CardContent>
    </Card>
  );
}
