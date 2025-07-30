import { authClient } from "@/auth";
import { ChatThread } from "@/components/layout/chat/ChatThread";
import { ChatProvider } from "@/components/layout/chat/context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { api, useQuery } from "@/hooks/api";
import { useNavigate, useParams } from "react-router";
import { ProjectContextProvider, useSelectedPage } from "./context";
import { ProjectHeader } from "./header/ProjectHeader";
import { ProjectPageSidebar } from "./ProjectPageSidebar";
import { ProjectPreview } from "./ProjectPreview";
import type { Project } from "./types";

function Component({ project }: { project: Project }) {
  const selectedPage = useSelectedPage();

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
      <ProjectHeader
        project={project}
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
        <div className="border-x">
          {!!selectedPage && <ProjectPageSidebar page={selectedPage} />}
        </div>
        <main className="flex-1">
          {/* <ProjectCanvas /> */}
          <ProjectPreview />
        </main>
      </div>
    </SidebarProvider>
  );
}

export function ProjectPage() {
  const { projectId, pageId } = useParams();
  const navigate = useNavigate();
  const project = useQuery(api.projects[":projectId"].$get, {
    params: { projectId },
  });
  const threadMessages = useQuery(
    api.chat.messages.projects[":projectId"].$get,
    { params: { projectId } }
  );
  const session = authClient.useSession();

  return (
    <ChatProvider
      ready={!session.isPending}
      endpoint={`chat/messages/projects/${projectId}`}
      initialMessages={threadMessages.data}
      onToolResult={(r) => {
        if (r.toolName === "updateMetadata") {
          project.refetch();
        }
      }}
    >
      <ProjectContextProvider
        projectId={projectId!}
        selectedPageId={pageId ?? null}
        onSelectPage={(pageId) =>
          navigate(`/projects/${projectId}/pages/${pageId}`)
        }
      >
        {!!project.data && <Component project={project.data} />}
      </ProjectContextProvider>
    </ChatProvider>
  );
}
