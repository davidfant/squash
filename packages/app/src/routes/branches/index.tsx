import { authClient } from "@/auth";
import { ChatThread } from "@/components/layout/chat/ChatThread";
import { SidebarProvider } from "@/components/ui/sidebar";
import { api, useQuery } from "@/hooks/api";
import { useParams } from "react-router";
import { BranchPreview } from "./BranchPreview";
import { BranchContextProvider, useBranchContext } from "./context";
import { BranchHeader } from "./header/BranchHeader";

function Component({ branchId }: { branchId: string }) {
  const { branch } = useBranchContext();

  const session = authClient.useSession();
  const threadMessages = useQuery(api.chat.branches[":branchId"].$get, {
    params: { branchId },
    enabled: !!session.data?.user,
  });

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
        onInvite={handleInvite}
        onUpgrade={handleUpgrade}
        publicUrl="https://my-awesome-landing-page.com"
      />
      <div className="flex-1 flex overflow-hidden">
        <ChatThread
          endpoint={`${import.meta.env.VITE_API_URL}/chat/branches/${branchId}`}
          initialMessages={threadMessages.data}
        />
        <BranchPreview className="flex-1" />
      </div>
    </SidebarProvider>
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
