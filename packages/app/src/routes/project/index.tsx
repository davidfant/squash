import { ChatThread } from "@/components/layout/chat/ChatThread";
import { ChatProvider } from "@/components/layout/chat/context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useNavigate, useParams } from "react-router";
import { v4 as uuid } from "uuid";
import { ProjectContextProvider, useProjectContext } from "./context";
import { ProjectHeader } from "./header/ProjectHeader";
import { ProjectPageSidebar } from "./ProjectPageSidebar";
import { ProjectPreview } from "./ProjectPreview";

function Component() {
  const { pages, selectedPage } = useProjectContext();

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
        projectName="Landing Page Builder"
        isPublic={true}
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
  const { pageId } = useParams();
  const navigate = useNavigate();
  return (
    <ChatProvider
      endpoint="/todo"
      initialMessages={[
        {
          id: uuid(),
          role: "user",
          content: [
            {
              type: "text",
              text: "I wanna build a LP!!!",
            },
            {
              type: "image",
              image: new URL(
                "https://media.istockphoto.com/id/2181735944/photo/natural-mountains-landscapes.jpg?s=612x612&w=0&k=20&c=4EZdF1438jegkW3U8h0TG4JaPO_cpMMBY-MouwLlyf4="
              ),
            },
          ],
        },
      ]}
    >
      <ProjectContextProvider
        selectedPageId={pageId}
        onSelectPage={(pageId) => navigate(`/project/page/${pageId}`)}
      >
        <Component />
      </ProjectContextProvider>
    </ChatProvider>
  );
}
