import { FilePreview } from "@/components/layout/file/FilePreview";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  ChatInputAttachButton,
  ChatInputDictateButton,
  ChatInputDictateCancelButton,
  ChatInputDictateStopButton,
  ChatInputStopButton,
  ChatInputSubmitButton,
} from "./buttons";
import { useChatInputContext, type ChatInputValue } from "./context";
import { DictationOverlay } from "./DictationOverlay";
import { useDictation } from "./useDictation";

export function ChatInput({
  submitting,
  autoFocus,
  minRows,
  maxRows,
  placeholder,
  disabled = false,
  Textarea: TextareaComponent = Textarea,
  extra,
  onStop,
  onSubmit,
  clearOnSubmit = true,
}: {
  submitting: boolean;
  autoFocus?: boolean;
  minRows?: number;
  maxRows?: number;
  placeholder?: string;
  disabled?: boolean;
  Textarea?: typeof Textarea;
  extra?: ReactNode;
  onStop?(): void;
  onSubmit(value: ChatInputValue): unknown;
  clearOnSubmit?: boolean;
}) {
  const input = useChatInputContext();
  const [isDragOver, setIsDragOver] = useState(false);
  const dictation = useDictation((t) =>
    input.setText((v) => (v ? `${v} ${t}` : t))
  );

  const [value, setValue] = useState(input.text);
  useEffect(() => {
    setValue(input.text);
  }, [input.text]);

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

      input.addFile(clipboardFiles);
    },
    [disabled, input.addFile]
  );

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      const hasFiles = Array.from(event.dataTransfer?.items ?? []).some(
        (item) => item.kind === "file"
      );
      if (!hasFiles) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (disabled) return;
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
    [disabled, isDragOver]
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
      if (disabled) return;
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (!files.length) return;
      input.addFile(files);
    },
    [disabled, input.addFile]
  );

  const handleSubmit = async () => {
    if (disabled) return;
    if (input.files.some((f) => f.status === "uploading")) return;
    if (!value.length && !input.files.length) return;
    const submittedValue = {
      text: value,
      files: input.files,
      state: input.state,
    };
    try {
      if (clearOnSubmit) {
        setValue("");
        input.setText("");
        input.setFiles([]);
        input.setState(undefined);
      }
      await onSubmit(submittedValue);
    } catch {
      if (clearOnSubmit) {
        input.setText(submittedValue.text);
        input.setFiles(submittedValue.files);
        input.setState(submittedValue.state);
      }
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
          disabled={submitting || input.isUploading || !value || disabled}
          loading={submitting || input.isUploading}
          onClick={handleSubmit}
        />
      </>
    );
  })();

  return (
    <Card
      className={cn(
        "relative p-2 transition-all shadow-none border border-input focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-4 overflow-hidden",
        isDragOver && "border-blue-500 ring-blue-500/40 ring-4"
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col gap-2 p-0">
        {input.input}
        {input.files.length > 0 && (
          <div className="flex flex-wrap gap-2 ml-2">
            {input.files.map((f) => (
              <FilePreview
                key={f.id}
                loading={f.status === "uploading"}
                file={f}
                onRemove={() => input.removeFile(f.id)}
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
            className="border-none shadow-none bg-transparent focus:ring-0 focus-visible:ring-0 transition-all"
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
            onClick={input.selectFile}
          />
          {extra}
          <div className="flex-1" />
          {buttons}
        </div>
      </CardContent>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-background opacity-0 transition-opacity text-sm font-medium text-blue-500",
          isDragOver && "opacity-100"
        )}
      >
        <div className="flex items-center justify-center h-full w-full bg-blue-500/10">
          Drop files to attach
        </div>
      </div>
    </Card>
  );
}
