import { WebPreview } from "@/components/ai-elements/web-preview";
import { SandboxTaskStream } from "@/components/blocks/SandboxTaskStream";
import { TabsContent } from "@/components/ui/tabs";
import { useAuthHeaders } from "@/hooks/api";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import type { SandboxTaskMessage } from "@squashai/api/agent/types";
import { DefaultChatTransport } from "ai";
import { useEffect } from "react";
import { BranchCodeViewer } from "./code/BranchCodeViewer";
import { useBranchContext } from "./context";
import { BranchPreview } from "./preview";

export function BranchTabContent({ className }: { className?: string }) {
  const { branch } = useBranchContext();

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

  const placeholder = (
    <div className="flex flex-col gap-2 h-full items-center pt-[30%] p-8 overflow-y-auto">
      <SandboxTaskStream stream={stream} label="Your preview is loading..." />
    </div>
  );

  return (
    <WebPreview className={cn("relative h-full bg-muted", className)}>
      <div className="z-2 w-full h-full">
        <TabsContent value="preview" className="h-full">
          <BranchPreview className="h-full bg-muted" />
        </TabsContent>

        <TabsContent value="code" className="h-full">
          <BranchCodeViewer />
        </TabsContent>
      </div>
      <div className="absolute inset-0 z-1 overflow-y-auto">{placeholder}</div>
    </WebPreview>
  );
}
