import { useRef, useState } from "react";

import { authClient } from "@/auth/client";
import { RequireRole } from "@/auth/RequireRole";
import { useBranchContext } from "@/components/layout/branch/context";
import { BranchHeader } from "@/components/layout/branch/header";
import { InviteButton } from "@/components/layout/branch/header/InviteButton";
import { ShareButton } from "@/components/layout/branch/header/ShareButton";
import { BranchTabContent } from "@/components/layout/branch/main-content";
import { ChatThread } from "@/components/layout/chat/ChatThread";
import { ChatProvider } from "@/components/layout/chat/context";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs } from "@/components/ui/tabs";
import { api, useQuery } from "@/hooks/api";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@squashai/api/agent/types";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { ChatInputProvider } from "../chat/input/context";
import { ForkButton } from "./header/ForkButton";

export function BranchLayout({ branchId }: { branchId: string }) {
  const { branch, setPreviewSha } = useBranchContext();

  const session = authClient.useSession();
  const threadMessages = useQuery(api.branches[":branchId"].messages.$get, {
    params: { branchId },
    enabled: !!session.data?.user,
  });

  const chatPanelRef = useRef<ImperativePanelHandle>(null);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  const toggleChatVisibility = () => {
    const panel = chatPanelRef.current;
    if (!panel) return;

    if (isChatCollapsed) {
      panel.expand();
    } else {
      panel.collapse();
    }
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
          if (latestSha) setPreviewSha(latestSha);
        }}
      >
        <ChatInputProvider>
          <div className="flex flex-col h-screen">
            <BranchHeader
              title={branch.title}
              inlineAction={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleChatVisibility}
                  aria-pressed={!isChatCollapsed}
                  aria-label={`${
                    isChatCollapsed ? "Show" : "Hide"
                  } chat thread`}
                >
                  {isChatCollapsed ? (
                    <PanelLeftOpen className="size-4" />
                  ) : (
                    <PanelLeftClose className="size-4" />
                  )}
                  <span className="sr-only">Toggle chat thread</span>
                </Button>
              }
              extra={
                <div className="flex items-center gap-2">
                  <RequireRole roles={["admin", "owner"]}>
                    <ForkButton />
                  </RequireRole>
                  <RequireRole roles={["admin", "owner"]}>
                    <InviteButton />
                  </RequireRole>
                  <ShareButton />
                </div>
              }
            />
            <ResizablePanelGroup
              direction="horizontal"
              className="flex-1 overflow-hidden"
            >
              <ResizablePanel
                ref={chatPanelRef}
                defaultSize={30}
                minSize={25}
                maxSize={35}
                collapsedSize={0}
                collapsible
                onCollapse={() => setIsChatCollapsed(true)}
                onExpand={() => setIsChatCollapsed(false)}
                className={cn("flex", isChatCollapsed && "ml-2")}
              >
                <ChatThread loading={threadMessages.isPending} id={branchId} />
              </ResizablePanel>
              <ResizableHandle className="bg-transparent w-[3px] data-[resize-handle-state=hover]:bg-primary/20 data-[resize-handle-state=drag]:bg-primary/20 transition-colors" />
              <ResizablePanel defaultSize={75} className="pr-2 pb-2">
                <BranchTabContent />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </ChatInputProvider>
      </ChatProvider>
    </Tabs>
  );
}
