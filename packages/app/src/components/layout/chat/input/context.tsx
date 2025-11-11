import {
  useFileUpload,
  type ChatInputFile,
} from "@/components/layout/file/useFileUpload";
import type { AgentState } from "@squashai/api/agent/types";
import type { FileUIPart } from "ai";
import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export interface ChatInputValue {
  text: string;
  files: FileUIPart[];
  state?: AgentState;
}

export interface ChatInputContextValue {
  text: string;
  state?: AgentState;
  files: ChatInputFile[];
  isUploading: boolean;
  input: React.JSX.Element;
  addFile: (files: File[]) => Promise<void>;
  removeFile: (id: string) => void;
  selectFile: () => void;
  setFiles: (files: ChatInputFile[]) => void;
  setText: Dispatch<SetStateAction<string>>;
  setState: Dispatch<SetStateAction<AgentState | undefined>>;
}

const ChatInputContext = createContext<ChatInputContextValue>({
  text: "",
  state: undefined,
  files: [],
  isUploading: false,
  input: <input />,
  addFile: () => {
    console.warn("add not implemented");
    return Promise.resolve();
  },
  removeFile: () => console.warn("remove not implemented"),
  selectFile: () => console.warn("select not implemented"),
  setFiles: () => console.warn("set not implemented"),
  setText: () => console.warn("set text not implemented"),
  setState: () => console.warn("set state not implemented"),
});

export interface ChatInputProviderProps {
  children: ReactNode;
  initialValue?: ChatInputValue;
  // onChange?(value: ChatInputValue): void;
}

export function ChatInputProvider({
  children,
  initialValue,
}: // onChange,
ChatInputProviderProps) {
  const [text, setText] = useState(initialValue?.text ?? "");
  const [state, setState] = useState(initialValue?.state);
  const uploads = useFileUpload(
    initialValue?.files.map((f) => ({
      ...f,
      id: Math.random().toString(36).substring(2, 15),
      status: "uploaded" as const,
    }))
  );

  // const chatInputValue = useDebounced(
  //   useMemo<ChatInputValue>(
  //     () => ({ text, state, files: uploads.files }),
  //     [text, state, uploads.files]
  //   ),
  //   500
  // );
  // console.log("chatInputValue", chatInputValue);
  // useEffect(() => onChange?.(chatInputValue), [chatInputValue, onChange]);

  const value: ChatInputContextValue = {
    text,
    state,
    files: uploads.files,
    isUploading: uploads.isUploading,
    input: uploads.input,
    addFile: uploads.add,
    removeFile: uploads.remove,
    selectFile: uploads.select,
    setFiles: uploads.set,
    setText,
    setState,
  };

  return (
    <ChatInputContext.Provider value={value}>
      {children}
    </ChatInputContext.Provider>
  );
}

export const useChatInputContext = () => useContext(ChatInputContext);
