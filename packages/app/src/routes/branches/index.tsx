import { authClient } from "@/auth";
import { ChatThread } from "@/components/layout/chat/ChatThread";
import { ChatProvider } from "@/components/layout/chat/context";
import { HistoryPanel } from "@/components/layout/chat/HistoryPanel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { SidebarProvider } from "@/components/ui/sidebar";
import { api, useQuery } from "@/hooks/api";
import type { ChatMessage } from "@squashai/api/agent/types";
import { useState } from "react";
import { useParams } from "react-router";
import { BranchPreview } from "./BranchPreview";
import { BranchContextProvider, useBranchContext } from "./context";
import { BranchHeader } from "./header/BranchHeader";

function Component({ branchId }: { branchId: string }) {
  const { branch, setPreview } = useBranchContext();
  const [isHistoryEnabled, setIsHistoryEnabled] = useState(false);

  const session = authClient.useSession();
  const threadMessages = useQuery(
    api.repos.branches[":branchId"].messages.$get,
    {
      params: { branchId },
      enabled: !!session.data?.user,
    }
  );

  return (
    <ChatProvider
      endpoint={`${
        import.meta.env.VITE_API_URL
      }/repos/branches/${branchId}/messages`}
      initialMessages={threadMessages.data as ChatMessage[]}
      onFinish={(step) => {
        const latestSha = step.messages
          .flatMap((m) => m.parts)
          .findLast((part) => part.type === "tool-GitCommit")
          ?.output?.commitSha;
        if (latestSha) setPreview(latestSha);
      }}
    >
      <SidebarProvider className="flex flex-col h-screen">
        <BranchHeader
          title={branch.name}
          isHistoryEnabled={isHistoryEnabled}
          onHistoryToggle={setIsHistoryEnabled}
          publicUrl="https://my-awesome-landing-page.com"
        />
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1 overflow-hidden"
        >
          <ResizablePanel
            defaultSize={30}
            minSize={25}
            maxSize={35}
            className="flex"
          >
            {isHistoryEnabled ? (
              <HistoryPanel
                onClose={() => setIsHistoryEnabled(false)}
                onSelectCommit={setPreview}
                className="w-full"
                threadId={branchId}
              />
            ) : (
              <ChatThread ready={!!threadMessages.data} id={branchId} />
            )}
          </ResizablePanel>
          <ResizableHandle className="bg-transparent w-[3px] data-[resize-handle-state=hover]:bg-primary/20 data-[resize-handle-state=drag]:bg-primary/20 transition-colors" />
          <ResizablePanel defaultSize={75} className="pr-2 pb-2">
            <BranchPreview />
          </ResizablePanel>
        </ResizablePanelGroup>
      </SidebarProvider>
    </ChatProvider>
  );
}

export function BranchPage() {
  const { branchId } = useParams();
  return (
    <BranchContextProvider branchId={branchId!}>
      <Component branchId={branchId!} />
    </BranchContextProvider>
  );
}
