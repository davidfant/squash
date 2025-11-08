import { SandboxTaskStream } from "@/components/blocks/SandboxTaskStream";
import { TabsContent } from "@/components/ui/tabs";
import { useAuthHeaders } from "@/hooks/api";
import { useMounted } from "@/hooks/use-mounted";
import { useChat } from "@ai-sdk/react";
import type { SandboxTaskMessage } from "@squashai/api/agent/types";
import { DefaultChatTransport } from "ai";
import { useEffect } from "react";
import { BranchCodeViewer } from "./code/BranchCodeViewer";
import { useBranchContext } from "./context";
import { BranchPreview } from "./preview";
import { BranchPreviewConsole } from "./preview/console";

export function BranchTabContent() {
  const { branch, preview } = useBranchContext();

  const headers = useAuthHeaders();
  const stream = useChat<SandboxTaskMessage>({
    messages: [],
    transport: new DefaultChatTransport({
      api: `${import.meta.env.VITE_API_URL}/branches/${
        branch.id
      }/preview/stream`,
      headers,
    }),
  });

  const mounted = useMounted();
  useEffect(() => {
    if (mounted) {
      stream.sendMessage();
    }
  }, [mounted]);

  if (!preview.url) {
    return (
      <div className="h-full rounded-xl bg-muted overflow-y-auto relative">
        <div className="flex flex-col gap-2 h-full items-center pt-[30%] p-8 overflow-y-auto">
          <SandboxTaskStream
            stream={stream}
            label="Your preview is loading..."
          />
        </div>
      </div>
    );
  }
  return (
    <>
      <TabsContent
        value="code"
        className="h-full rounded-xl bg-muted overflow-hidden"
      >
        <BranchCodeViewer />
      </TabsContent>
      <TabsContent value="preview" className="flex gap-2 h-full">
        <div className="h-full rounded-xl bg-muted overflow-hidden flex-1 border">
          <BranchPreview />
        </div>
        <BranchPreviewConsole />
      </TabsContent>
    </>
  );
}
