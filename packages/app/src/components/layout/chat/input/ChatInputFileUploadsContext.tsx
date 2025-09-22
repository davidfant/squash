import {
  useFileUpload,
  type ChatInputFile,
} from "@/components/layout/file/useFileUpload";
import type { FileUIPart } from "ai";
import { createContext, useContext, type ReactNode } from "react";

export interface ChatInputFileUploadsContextValue {
  files: ChatInputFile[];
  isUploading: boolean;
  input: React.JSX.Element;
  add: (files: File[]) => Promise<void>;
  remove: (id: string) => void;
  select: () => void;
  set: (files: ChatInputFile[]) => void;
}

const ChatInputFileUploadsContext =
  createContext<ChatInputFileUploadsContextValue>({
    files: [],
    isUploading: false,
    input: <input />,
    add: () => {
      console.warn("add not implemented");
      return Promise.resolve();
    },
    remove: () => console.warn("remove not implemented"),
    select: () => console.warn("select not implemented"),
    set: () => console.warn("set not implemented"),
  });

export interface ChatInputFileUploadsProviderProps {
  children: ReactNode;
  initialValue?: FileUIPart[];
}

export function ChatInputFileUploadsProvider({
  children,
  initialValue,
}: ChatInputFileUploadsProviderProps) {
  const uploads = useFileUpload(
    initialValue?.map((f) => ({
      ...f,
      id: Math.random().toString(36).substring(2, 15),
      status: "uploaded" as const,
    }))
  );

  const value: ChatInputFileUploadsContextValue = {
    files: uploads.files,
    isUploading: uploads.isUploading,
    input: uploads.input,
    add: uploads.add,
    remove: uploads.remove,
    select: uploads.select,
    set: uploads.set,
  };

  return (
    <ChatInputFileUploadsContext.Provider value={value}>
      {children}
    </ChatInputFileUploadsContext.Provider>
  );
}

export const useChatInputFileUploads = () =>
  useContext(ChatInputFileUploadsContext);
