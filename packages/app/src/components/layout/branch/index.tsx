import { useBranchContext } from "@/components/layout/branch/context";
import { BranchHeader } from "@/components/layout/branch/header/branch-header";
import { BranchTabContent } from "@/components/layout/branch/main-content";
import { ChatThread } from "@/components/layout/chat/ChatThread";
import { ChatProvider } from "@/components/layout/chat/context";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs } from "@/components/ui/tabs";
import { api, useQuery } from "@/hooks/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/clerk-react";
import type { ChatMessage } from "@squashai/api/agent/types";
import { useRef, useState } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { ChatInputProvider } from "../chat/input/context";

export function BranchLayout({ branchId }: { branchId: string }) {
  const { branch, preview } = useBranchContext();

  const { isSignedIn } = useAuth();
  const threadMessages = useQuery(api.branches[":branchId"].messages.$get, {
    params: { branchId },
    enabled: isSignedIn,
  });

  const chatPanelRef = useRef<ImperativePanelHandle>(null);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [siderWidth, setSiderWidth] = useState(30);

  const toggleChatVisibility = () => {
    const panel = chatPanelRef.current;
    if (!panel) return;
    if (isChatCollapsed) panel.expand();
    else panel.collapse();
  };

  return (
    <Tabs defaultValue="preview">
      <ChatProvider
        endpoint={`${
          import.meta.env.VITE_API_URL
        }/branches/${branchId}/messages`}
        initialMessages={threadMessages.data as ChatMessage[]}
        onFinish={(step) => {
          const latestSha = step.message.parts.findLast(
            (part) => part.type === "tool-GitCommit"
          )?.output?.sha;
          if (latestSha) preview.setSha(latestSha);
        }}
      >
        <ChatInputProvider>
          <div className="flex flex-col h-screen">
            <BranchHeader
              title={branch.repo.name}
              siderWidth={isChatCollapsed ? undefined : siderWidth}
              onToggleSider={toggleChatVisibility}
            />
            <ResizablePanelGroup
              direction="horizontal"
              className="flex-1 overflow-hidden"
            >
              <ResizablePanel
                ref={chatPanelRef}
                defaultSize={siderWidth}
                minSize={20}
                maxSize={40}
                collapsedSize={0}
                collapsible
                onResize={(size) => setSiderWidth(size)}
                onCollapse={() => setIsChatCollapsed(true)}
                onExpand={() => setIsChatCollapsed(false)}
                className={cn("flex", isChatCollapsed && "ml-2")}
              >
                <ChatThread loading={threadMessages.isPending} id={branchId} />
              </ResizablePanel>
              <ResizableHandle className="bg-transparent w-[3px] data-[resize-handle-state=hover]:bg-primary/20 data-[resize-handle-state=drag]:bg-primary/20 transition-colors" />
              <ResizablePanel defaultSize={75} className="pb-2">
                <BranchTabContent />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </ChatInputProvider>
      </ChatProvider>
    </Tabs>
  );
}
