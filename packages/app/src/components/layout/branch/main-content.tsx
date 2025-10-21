import { WebPreview } from "@/components/ai-elements/web-preview";
import { TabsContent } from "@/components/ui/tabs";
import { useMounted } from "@/hooks/useMounted";
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

  const stream = useChat<SandboxTaskMessage>({
    messages: [],
    transport: new DefaultChatTransport({
      api: `${import.meta.env.VITE_API_URL}/branches/${
        branch.id
      }/preview/stream`,
      credentials: "include",
    }),
  });

  const mounted = useMounted();
  useEffect(() => {
    if (mounted) {
      stream.sendMessage();
    }
  }, [mounted, stream]);

  return (
    <WebPreview className={cn("relative h-full", className)}>
      <TabsContent
        value="preview"
        className="relative h-full focus-visible:outline-none"
      >
        <BranchPreview className="h-full" />
      </TabsContent>

      <TabsContent value="code" className="h-full">
        <BranchCodeViewer />
      </TabsContent>
    </WebPreview>
  );
}
