import { authClient } from "@/auth";
import { ChatThread } from "@/components/layout/chat/ChatThread";
import { ChatProvider } from "@/components/layout/chat/context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { api, useQuery } from "@/hooks/api";
import { useParams } from "react-router";
import { BranchPreview } from "./BranchPreview";
import { BranchContextProvider, useBranchContext } from "./context";
import { BranchHeader } from "./header/BranchHeader";

function Component() {
  const { branch } = useBranchContext();
  const handleHistoryToggle = (enabled: boolean) => {
    console.log("History toggle:", enabled);
  };

  const handleHideChatSidebar = () => {
    console.log("Hide chat sidebar");
  };

  const handleRefresh = () => {
    console.log("Refresh");
    window.location.reload();
  };

  const handleOpenInNewTab = () => {
    console.log("Open in new tab");
    window.open(window.location.href, "_blank");
  };

  const handleInvite = () => {
    console.log("Invite collaborators");
  };

  const handleUpgrade = () => {
    console.log("Upgrade plan");
  };

  return (
    <SidebarProvider className="flex flex-col h-screen">
      <BranchHeader
        title={branch.name}
        isHistoryEnabled={false}
        onHistoryToggle={handleHistoryToggle}
        onHideChatSidebar={handleHideChatSidebar}
        onRefresh={handleRefresh}
        onOpenInNewTab={handleOpenInNewTab}
        userName="John Doe"
        onInvite={handleInvite}
        onUpgrade={handleUpgrade}
        publicUrl="https://my-awesome-landing-page.com"
      />
      <div className="flex-1 flex">
        <ChatThread className="p-2 flex-shrink-0" />
        <main className="flex-1">
          <BranchPreview />
        </main>
      </div>
    </SidebarProvider>
  );
}

export function BranchPage() {
  const { branchId } = useParams();
  const threadMessages = useQuery(
    api.chat.messages.branches[":branchId"].$get,
    { params: { branchId } }
  );
  const session = authClient.useSession();

  return (
    <ChatProvider
      ready={!session.isPending}
      endpoint={`chat/messages/branches/${branchId}`}
      initialMessages={threadMessages.data}
    >
      <BranchContextProvider branchId={branchId!}>
        <Component />
      </BranchContextProvider>
    </ChatProvider>
  );
}
