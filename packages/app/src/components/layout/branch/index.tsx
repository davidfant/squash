import { authClient } from "@/auth/client";
import { RequireRole } from "@/auth/RequireRole";
import { BranchHeader } from "@/components/blocks/branch/header";
import { useBranchContext } from "@/components/layout/branch/context";
import { InviteButton } from "@/components/layout/branch/header/InviteButton";
import { ShareButton } from "@/components/layout/branch/header/ShareButton";
import { BranchPreview } from "@/components/layout/branch/preview";
import { ChatThread } from "@/components/layout/chat/ChatThread";
import { ChatProvider } from "@/components/layout/chat/context";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { api, useQuery } from "@/hooks/api";
import type { ChatMessage } from "@squashai/api/agent/types";
import { ChatInputProvider } from "../chat/input/context";
import { ForkButton } from "./header/ForkButton";

export function BranchLayout({ branchId }: { branchId: string }) {
  const { branch, setPreviewSha } = useBranchContext();

  const session = authClient.useSession();
  const threadMessages = useQuery(api.branches[":branchId"].messages.$get, {
    params: { branchId },
    enabled: !!session.data?.user,
  });

  return (
    <ChatProvider
      endpoint={`${import.meta.env.VITE_API_URL}/branches/${branchId}/messages`}
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
              defaultSize={30}
              minSize={25}
              maxSize={35}
              className="flex"
            >
              <ChatThread loading={threadMessages.isPending} id={branchId} />
            </ResizablePanel>
            <ResizableHandle className="bg-transparent w-[3px] data-[resize-handle-state=hover]:bg-primary/20 data-[resize-handle-state=drag]:bg-primary/20 transition-colors" />
            <ResizablePanel defaultSize={75} className="pr-2 pb-2">
              <BranchPreview />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </ChatInputProvider>
    </ChatProvider>
  );
}
