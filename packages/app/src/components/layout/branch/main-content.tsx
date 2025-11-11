import { SandboxTaskStream } from "@/components/blocks/SandboxTaskStream";
import { Card } from "@/components/ui/card";
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
      <Card className="h-full bg-muted flex flex-col items-center pt-[30%] p-8 overflow-y-auto">
        <SandboxTaskStream stream={stream} label="Your preview is loading..." />
      </Card>
    );
  }
  return (
    <>
      <TabsContent
        value="code"
        className="h-full rounded-xl bg-muted overflow-hidden border"
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
